from __future__ import annotations

from typing import Any, Dict

from omni_ai.human.head.envelopes import HeadRequest, HeadResponse
from omni_ai.human.head.integration.graphs import supported_graphs
from omni_ai.human.head.integration.search import search_head
from omni_ai.human.head.integration.trace import trace_structure
from omni_ai.human.head.integration.validate import validate_graph

FUNCTION_DESCRIPTIONS: Dict[str, str] = {
    "smile": "Elevation of mouth corners and associated eye expression.",
    "chew": "Rhythmic movement of mandible to break down food.",
    "speak": "Coordinated movement of tongue, lips, and larynx to produce speech.",
    "blink": "Rapid eyelid closure for ocular protection and tear distribution.",
    "swallow": "Sequential oral-to-pharyngeal transfer of a bolus.",
    "look_left": "Conjugate gaze movement to the left.",
    "look_right": "Conjugate gaze movement to the right.",
    "look_up": "Conjugate gaze movement upward.",
    "look_down": "Conjugate gaze movement downward.",
    "raise_eyebrows": "Forehead elevation and brow raising expression.",
    "frown": "Medial brow draw and forehead contraction expression.",
}

CANONICAL_NAMES: Dict[str, str] = {
    "smile": "smile",
    "smiling": "smile",
    "chew": "chew",
    "chewing": "chew",
    "mastication": "chew",
    "speak": "speak",
    "speech": "speak",
    "talk": "speak",
    "blink": "blink",
    "swallow": "swallow",
    "deglutition": "swallow",
    "look_left": "look_left",
    "look_right": "look_right",
    "look_up": "look_up",
    "look_down": "look_down",
    "raise_eyebrows": "raise_eyebrows",
    "frown": "frown",
}


def explain_function(name: str) -> Dict[str, Any]:
    key = name.strip().lower()
    graph_fn = supported_graphs().get(key)
    canonical = CANONICAL_NAMES.get(key, key)
    if graph_fn is not None:
        graph = graph_fn()
        errors = validate_graph(graph)
        return {
            "name": canonical,
            "description": FUNCTION_DESCRIPTIONS.get(canonical, "Functional graph explanation."),
            "graph": graph,
            "validation": {
                "valid": not errors,
                "errors": errors,
            },
        }

    return {
        "name": key,
        "description": "Unknown or unsupported function.",
        "graph": {"nodes": [], "edges": []},
        "supported": sorted(set(supported_graphs().keys())),
    }


def handle_integration_request(req: HeadRequest) -> HeadResponse:
    if req.operation == "explain_function":
        function_name = req.payload.get("name", "")
        explanation = explain_function(function_name)
        return HeadResponse(
            system="human_head",
            subsystem="integration",
            operation=req.operation,
            status="ok",
            result=explanation,
        )

    if req.operation == "validate_function":
        function_name = req.payload.get("name", "")
        explanation = explain_function(function_name)
        validation = explanation.get("validation", {"valid": False, "errors": ["Unsupported function"]})
        return HeadResponse(
            system="human_head",
            subsystem="integration",
            operation=req.operation,
            status="ok",
            result={"name": function_name, "validation": validation},
        )

    if req.operation == "search":
        query = req.payload.get("query", "")
        results = search_head(query)
        return HeadResponse(
            system="human_head",
            subsystem="integration",
            operation=req.operation,
            status="ok",
            result={"query": query, "results": results},
        )

    if req.operation == "trace":
        structure_id = req.payload.get("id", "")
        include_neck = bool(req.payload.get("include_neck", True))
        if not structure_id:
            return HeadResponse(
                system="human_head",
                subsystem="integration",
                operation=req.operation,
                status="error",
                error="Missing required field: id",
            )
        result = trace_structure(structure_id, include_neck=include_neck)
        return HeadResponse(
            system="human_head",
            subsystem="integration",
            operation=req.operation,
            status="ok",
            result={"id": structure_id, "include_neck": include_neck, "connections": result},
        )

    return HeadResponse(
        system="human_head",
        subsystem="integration",
        operation=req.operation,
        status="error",
        error=f"Unsupported integration operation: {req.operation}",
    )
