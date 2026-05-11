# ion_job_runner.py
# Ionirix → ComfyUI Job Runner
# Author: Mirnes Kudić

import json
import uuid
import time
import requests
from typing import Dict, Any, Optional, AsyncIterator
from decimal import Decimal

from ion_credits import CreditLedger
from db import IonDB


class IonJobRunner:
    """
    Handles:
      - workflow submission
      - websocket event streaming
      - credit reservation
      - GPU metering
      - final charge or refund
      - output packaging
    """

    def __init__(
        self,
        comfy_host: str = "http://127.0.0.1:8188",
        db_path: str = "ion.db"
    ):
        self.comfy_host = comfy_host
        self.db = IonDB(db_path)
        self.ledger = CreditLedger(self.db)
        self.comfy_prompt_path = f"{comfy_host}/prompt"
        self.comfy_queue_path = f"{comfy_host}/queue"
        self.comfy_history_path = f"{comfy_host}/history"

    # ---------------------------------------------------------
    # MAIN ENTRYPOINT
    # ---------------------------------------------------------
    def run_job(
        self,
        user_id: str,
        workflow: Dict[str, Any],
        estimated_cost: float
    ) -> Dict[str, Any]:
        """
        Run a ComfyUI workflow with full credit accounting.
        
        Args:
            user_id: User submitting the job
            workflow: ComfyUI workflow JSON
            estimated_cost: Estimated credit cost
            
        Returns:
            Job result with billing info
        """
        job_id = f"ion-{uuid.uuid4()}"

        try:
            # 1. Reserve credits
            self.ledger.reserve_credits(user_id, job_id, estimated_cost)

            # 2. Validate workflow
            self._validate_workflow(workflow)

            # 3. Submit workflow to ComfyUI
            prompt_id = self._submit_workflow(workflow)

            # 4. Poll for completion
            output = self._poll_completion(job_id, prompt_id)

            # 5. Final charge
            charge_info = self.ledger.charge(job_id)

            # 6. Return final output
            return {
                "status": "completed",
                "job_id": job_id,
                "prompt_id": prompt_id,
                "output": output,
                "billing": charge_info
            }

        except Exception as e:
            # On failure → refund reservation
            self.ledger.release(job_id)
            return {
                "status": "failed",
                "job_id": job_id,
                "error": str(e),
                "billing": {
                    "status": "released",
                    "refund": estimated_cost
                }
            }

    # ---------------------------------------------------------
    # WORKFLOW VALIDATION
    # ---------------------------------------------------------
    def _validate_workflow(self, workflow: Dict[str, Any]):
        """
        Validate workflow structure before submission.
        Catches malformed workflows that would cause 400 errors.
        """
        if not isinstance(workflow, dict):
            raise ValueError("Workflow must be a dictionary")

        # Check for required node structure
        has_model_loader = False
        has_sampler = False
        has_save = False

        for node_id, node in workflow.items():
            if not isinstance(node, dict):
                continue

            class_type = node.get("class_type", "")

            if class_type == "CheckpointLoaderSimple":
                has_model_loader = True
            elif class_type == "KSampler":
                has_sampler = True
                # Validate inputs
                inputs = node.get("inputs", {})
                required_inputs = ["model", "positive", "negative", "latent_image"]
                for req in required_inputs:
                    if req not in inputs:
                        raise ValueError(f"KSampler missing required input: {req}")

            elif class_type == "SaveImage":
                has_save = True

            # Validate inputs are properly formatted
            inputs = node.get("inputs", {})
            if isinstance(inputs, dict):
                for key, value in inputs.items():
                    # Connection refs must be [node_id, output_index]
                    if isinstance(value, list) and len(value) == 2:
                        if not isinstance(value[0], (str, int)):
                            raise ValueError(f"Invalid node reference in {node_id}.{key}: {value}")

        if not has_model_loader:
            raise ValueError("Workflow must include a CheckpointLoaderSimple node")
        if not has_sampler:
            raise ValueError("Workflow must include a KSampler node")
        if not has_save:
            raise ValueError("Workflow must include a SaveImage node")

    # ---------------------------------------------------------
    # SUBMIT WORKFLOW TO COMFYUI
    # ---------------------------------------------------------
    def _submit_workflow(self, workflow: Dict[str, Any]) -> str:
        """
        Submit workflow to ComfyUI /prompt endpoint.
        Returns prompt_id.
        """
        try:
            # Prepare payload
            payload = {
                "prompt": workflow
            }

            # Submit
            response = requests.post(
                self.comfy_prompt_path,
                json=payload,
                timeout=10
            )

            # Check response
            if response.status_code != 200:
                error_msg = response.text
                try:
                    error_data = response.json()
                    error_msg = json.dumps(error_data, indent=2)
                except:
                    pass
                raise ValueError(
                    f"ComfyUI returned {response.status_code}: {error_msg}"
                )

            data = response.json()
            prompt_id = str(data.get("prompt_id") or "").strip()

            if not prompt_id:
                raise ValueError("ComfyUI did not return a prompt_id")

            return prompt_id

        except requests.exceptions.RequestException as e:
            raise ValueError(f"Failed to submit workflow to ComfyUI: {e}")

    # ---------------------------------------------------------
    # POLL FOR COMPLETION
    # ---------------------------------------------------------
    def _poll_completion(self, job_id: str, prompt_id: str) -> Dict[str, Any]:
        """
        Poll ComfyUI for job completion.
        Meters GPU usage along the way.
        """
        max_attempts = 120
        poll_interval = 0.5

        for attempt in range(max_attempts):
            try:
                # Get status
                response = requests.get(
                    f"{self.comfy_history_path}/{prompt_id}",
                    timeout=10
                )

                if response.status_code != 200:
                    time.sleep(poll_interval)
                    continue

                history = response.json()

                if prompt_id not in history:
                    # Job not found in history yet
                    time.sleep(poll_interval)
                    continue

                job_data = history[prompt_id]

                # Check for errors
                if "error" in job_data or "errors" in job_data:
                    raise ValueError(f"ComfyUI job failed: {job_data.get('error', job_data.get('errors'))}")

                # Check for outputs
                outputs = job_data.get("outputs", {})
                if outputs:
                    # Meter the GPU usage
                    self.ledger.meter(job_id, {
                        "type": "node_completed",
                        "gpu_ms": 100.0  # Placeholder - real implementation would track actual GPU time
                    })
                    return {
                        "prompt_id": prompt_id,
                        "outputs": outputs
                    }

                time.sleep(poll_interval)

            except requests.exceptions.RequestException:
                time.sleep(poll_interval)
                continue

        raise TimeoutError(f"ComfyUI job {prompt_id} timed out after {max_attempts * poll_interval} seconds")

    # ---------------------------------------------------------
    # UTILITY METHODS
    # ---------------------------------------------------------
    def get_user_balance(self, user_id: str) -> float:
        """Get user's current balance."""
        return float(self.ledger.get_balance(user_id))

    def get_user_history(self, user_id: str, limit: int = 100) -> list:
        """Get user's job history."""
        return self.ledger.get_ledger_entries(user_id, limit)

    def close(self):
        """Close database connection."""
        self.db.close()
