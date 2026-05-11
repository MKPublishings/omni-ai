# ion_credits.py
# Ionirix Credit Accounting Hooks
# Author: Mirnes Kudić

import time
import threading
from decimal import Decimal
from typing import Dict, Optional, Any


class CreditLedger:
    """
    Atomic, thread-safe credit ledger for Ionirix.
    Handles:
      - reservations
      - metering
      - final charges
      - refunds
      - job lifecycle tracking
    """

    def __init__(self, db):
        self.db = db
        self.lock = threading.Lock()

    # ---------------------------------------------------------
    # 1. RESERVE CREDITS
    # ---------------------------------------------------------
    def reserve_credits(self, user_id: str, job_id: str, amount: float) -> Dict[str, Any]:
        """
        Reserve credits before job submission.
        Prevents insufficient balance and double-spend.
        """
        amount = Decimal(str(amount))

        with self.lock:
            balance = self.db.get_balance(user_id)

            if balance < amount:
                raise ValueError(f"Insufficient credits: {balance} < {amount}")

            # Deduct immediately but mark as 'reserved'
            self.db.update_balance(user_id, balance - amount)
            self.db.create_reservation(job_id, user_id, amount)

            return {
                "status": "reserved",
                "job_id": job_id,
                "amount": float(amount),
                "user_id": user_id,
                "timestamp": time.time()
            }

    # ---------------------------------------------------------
    # 2. METERING DURING EXECUTION
    # ---------------------------------------------------------
    def meter(self, job_id: str, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Called for every ion websocket event.
        Tracks GPU time, node usage, etc.
        """
        if event.get("type") == "node_completed":
            gpu_ms = event.get("gpu_ms", 0)
            self.db.append_meter(job_id, gpu_ms)

        return {"status": "metered", "job_id": job_id}

    # ---------------------------------------------------------
    # 3. FINAL CHARGE
    # ---------------------------------------------------------
    def charge(self, job_id: str) -> Dict[str, Any]:
        """
        Finalizes the charge based on actual usage.
        Refunds unused reservation.
        """
        with self.lock:
            reservation = self.db.get_reservation(job_id)
            if not reservation:
                raise ValueError(f"No reservation found for job {job_id}")

            user_id = reservation["user_id"]
            reserved = Decimal(str(reservation["amount"]))

            # Compute actual cost
            gpu_ms = self.db.sum_meter(job_id)
            actual_cost = self._calculate_cost(gpu_ms)

            # Refund difference
            refund = reserved - actual_cost
            if refund > 0:
                balance = self.db.get_balance(user_id)
                self.db.update_balance(user_id, balance + refund)

            # Write final ledger entry
            self.db.write_ledger_entry(
                job_id=job_id,
                user_id=user_id,
                reserved=float(reserved),
                charged=float(actual_cost),
                refund=float(refund),
                gpu_ms=gpu_ms,
                timestamp=time.time()
            )

            # Clear reservation + meter
            self.db.clear_reservation(job_id)
            self.db.clear_meter(job_id)

            return {
                "status": "charged",
                "job_id": job_id,
                "charged": float(actual_cost),
                "refund": float(refund),
                "user_id": user_id
            }

    # ---------------------------------------------------------
    # 4. RELEASE (ON FAILURE)
    # ---------------------------------------------------------
    def release(self, job_id: str) -> Dict[str, Any]:
        """
        Refunds full reservation if job fails.
        """
        with self.lock:
            reservation = self.db.get_reservation(job_id)
            if not reservation:
                return {"status": "no_reservation", "job_id": job_id}

            user_id = reservation["user_id"]
            amount = Decimal(str(reservation["amount"]))

            balance = self.db.get_balance(user_id)
            self.db.update_balance(user_id, balance + amount)

            self.db.clear_reservation(job_id)
            self.db.clear_meter(job_id)

            # Write failure ledger entry
            self.db.write_ledger_entry(
                job_id=job_id,
                user_id=user_id,
                reserved=float(amount),
                charged=0.0,
                refund=float(amount),
                gpu_ms=0,
                timestamp=time.time(),
                status="released"
            )

            return {
                "status": "released",
                "job_id": job_id,
                "refund": float(amount),
                "user_id": user_id
            }

    # ---------------------------------------------------------
    # INTERNAL COST FUNCTION
    # ---------------------------------------------------------
    def _calculate_cost(self, gpu_ms: float) -> Decimal:
        """
        Converts GPU time → credits.
        Tunable by you.
        Current: 0.002 credits per GPU millisecond
        """
        rate = Decimal("0.002")  # credits per GPU millisecond
        return Decimal(str(gpu_ms)) * rate

    def get_balance(self, user_id: str) -> Decimal:
        """Get current user balance."""
        return self.db.get_balance(user_id)

    def get_ledger_entries(self, user_id: str, limit: int = 100) -> list:
        """Get recent ledger entries for user."""
        return self.db.get_ledger_entries(user_id, limit)
