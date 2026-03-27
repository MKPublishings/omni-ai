from __future__ import annotations

from typing import Any, Callable, Dict, List

Graph = Dict[str, List[Dict[str, str]]]


def smile_graph() -> Graph:
    nodes = [
        {"id": "zygomaticus_major", "type": "muscle", "label": "Zygomaticus Major"},
        {"id": "orbicularis_oculi", "type": "muscle", "label": "Orbicularis Oculi"},
        {"id": "facial_nerve", "type": "nerve", "label": "Facial Nerve (VII)"},
        {"id": "motor_cortex", "type": "brain_region", "label": "Motor Cortex"},
        {"id": "prefrontal_cortex", "type": "brain_region", "label": "Prefrontal Cortex"},
    ]
    edges = [
        {"source": "prefrontal_cortex", "target": "motor_cortex", "relation": "plans_movement"},
        {"source": "motor_cortex", "target": "facial_nerve", "relation": "sends_signal"},
        {"source": "facial_nerve", "target": "zygomaticus_major", "relation": "innervates"},
        {"source": "facial_nerve", "target": "orbicularis_oculi", "relation": "innervates"},
    ]
    return {"nodes": nodes, "edges": edges}


def chew_graph() -> Graph:
    nodes = [
        {"id": "masseter", "type": "muscle", "label": "Masseter"},
        {"id": "temporalis", "type": "muscle", "label": "Temporalis"},
        {"id": "medial_pterygoid", "type": "muscle", "label": "Medial Pterygoid"},
        {"id": "lateral_pterygoid", "type": "muscle", "label": "Lateral Pterygoid"},
        {"id": "trigeminal_nerve", "type": "nerve", "label": "Trigeminal Nerve (V)"},
        {"id": "motor_cortex", "type": "brain_region", "label": "Motor Cortex"},
        {"id": "mandible", "type": "bone", "label": "Mandible"},
        {"id": "maxilla_left", "type": "bone", "label": "Left Maxilla"},
        {"id": "maxilla_right", "type": "bone", "label": "Right Maxilla"},
        {"id": "teeth", "type": "structure", "label": "Teeth"},
    ]
    edges = [
        {"source": "motor_cortex", "target": "trigeminal_nerve", "relation": "sends_signal"},
        {"source": "trigeminal_nerve", "target": "masseter", "relation": "innervates"},
        {"source": "trigeminal_nerve", "target": "temporalis", "relation": "innervates"},
        {"source": "trigeminal_nerve", "target": "medial_pterygoid", "relation": "innervates"},
        {"source": "trigeminal_nerve", "target": "lateral_pterygoid", "relation": "innervates"},
        {"source": "masseter", "target": "mandible", "relation": "moves"},
        {"source": "temporalis", "target": "mandible", "relation": "moves"},
        {"source": "medial_pterygoid", "target": "mandible", "relation": "moves"},
        {"source": "lateral_pterygoid", "target": "mandible", "relation": "moves"},
        {"source": "mandible", "target": "teeth", "relation": "supports"},
        {"source": "maxilla_left", "target": "teeth", "relation": "supports"},
        {"source": "maxilla_right", "target": "teeth", "relation": "supports"},
    ]
    return {"nodes": nodes, "edges": edges}


def speak_graph() -> Graph:
    nodes = [
        {"id": "broca_area", "type": "brain_region", "label": "Broca Area"},
        {"id": "motor_cortex", "type": "brain_region", "label": "Motor Cortex"},
        {"id": "facial_nerve", "type": "nerve", "label": "Facial Nerve (VII)"},
        {"id": "trigeminal_nerve", "type": "nerve", "label": "Trigeminal Nerve (V)"},
        {"id": "vagus_nerve", "type": "nerve", "label": "Vagus Nerve (X)"},
        {"id": "hypoglossal_nerve", "type": "nerve", "label": "Hypoglossal Nerve (XII)"},
        {"id": "genioglossus", "type": "muscle", "label": "Tongue Muscles"},
        {"id": "orbicularis_oris", "type": "muscle", "label": "Orbicularis Oris"},
        {"id": "larynx", "type": "structure", "label": "Larynx"},
    ]
    edges = [
        {"source": "broca_area", "target": "motor_cortex", "relation": "plans_speech"},
        {"source": "motor_cortex", "target": "facial_nerve", "relation": "sends_signal"},
        {"source": "motor_cortex", "target": "trigeminal_nerve", "relation": "sends_signal"},
        {"source": "motor_cortex", "target": "vagus_nerve", "relation": "sends_signal"},
        {"source": "motor_cortex", "target": "hypoglossal_nerve", "relation": "sends_signal"},
        {"source": "facial_nerve", "target": "orbicularis_oris", "relation": "innervates"},
        {"source": "hypoglossal_nerve", "target": "genioglossus", "relation": "innervates"},
        {"source": "vagus_nerve", "target": "larynx", "relation": "controls"},
    ]
    return {"nodes": nodes, "edges": edges}


def blink_graph() -> Graph:
    nodes = [
        {"id": "visual_cortex", "type": "brain_region", "label": "Visual Cortex"},
        {"id": "facial_nerve", "type": "nerve", "label": "Facial Nerve (VII)"},
        {"id": "orbicularis_oculi", "type": "muscle", "label": "Orbicularis Oculi"},
    ]
    edges = [
        {"source": "visual_cortex", "target": "facial_nerve", "relation": "routes_reflex_signal"},
        {"source": "facial_nerve", "target": "orbicularis_oculi", "relation": "innervates"},
    ]
    return {"nodes": nodes, "edges": edges}


def swallow_graph() -> Graph:
    nodes = [
        {"id": "motor_cortex", "type": "brain_region", "label": "Motor Cortex"},
        {"id": "glossopharyngeal_nerve", "type": "nerve", "label": "Glossopharyngeal Nerve (IX)"},
        {"id": "vagus_nerve", "type": "nerve", "label": "Vagus Nerve (X)"},
        {"id": "pharyngeal_constrictors", "type": "muscle", "label": "Pharyngeal Constrictors"},
        {"id": "pharynx", "type": "structure", "label": "Pharynx"},
    ]
    edges = [
        {"source": "motor_cortex", "target": "glossopharyngeal_nerve", "relation": "sends_signal"},
        {"source": "motor_cortex", "target": "vagus_nerve", "relation": "sends_signal"},
        {"source": "glossopharyngeal_nerve", "target": "pharyngeal_constrictors", "relation": "innervates"},
        {"source": "vagus_nerve", "target": "pharyngeal_constrictors", "relation": "innervates"},
        {"source": "pharyngeal_constrictors", "target": "pharynx", "relation": "moves"},
    ]
    return {"nodes": nodes, "edges": edges}


def look_left_graph() -> Graph:
    nodes = [
        {"id": "motor_cortex", "type": "brain_region", "label": "Motor Cortex"},
        {"id": "abducens_nerve", "type": "nerve", "label": "Abducens Nerve (VI)"},
        {"id": "oculomotor_nerve", "type": "nerve", "label": "Oculomotor Nerve (III)"},
        {"id": "lateral_rectus", "type": "muscle", "label": "Left Lateral Rectus"},
        {"id": "medial_rectus", "type": "muscle", "label": "Right Medial Rectus"},
    ]
    edges = [
        {"source": "motor_cortex", "target": "abducens_nerve", "relation": "sends_signal"},
        {"source": "motor_cortex", "target": "oculomotor_nerve", "relation": "sends_signal"},
        {"source": "abducens_nerve", "target": "lateral_rectus", "relation": "innervates"},
        {"source": "oculomotor_nerve", "target": "medial_rectus", "relation": "innervates"},
    ]
    return {"nodes": nodes, "edges": edges}


def look_right_graph() -> Graph:
    nodes = [
        {"id": "motor_cortex", "type": "brain_region", "label": "Motor Cortex"},
        {"id": "abducens_nerve", "type": "nerve", "label": "Abducens Nerve (VI)"},
        {"id": "oculomotor_nerve", "type": "nerve", "label": "Oculomotor Nerve (III)"},
        {"id": "lateral_rectus", "type": "muscle", "label": "Right Lateral Rectus"},
        {"id": "medial_rectus", "type": "muscle", "label": "Left Medial Rectus"},
    ]
    edges = [
        {"source": "motor_cortex", "target": "abducens_nerve", "relation": "sends_signal"},
        {"source": "motor_cortex", "target": "oculomotor_nerve", "relation": "sends_signal"},
        {"source": "abducens_nerve", "target": "lateral_rectus", "relation": "innervates"},
        {"source": "oculomotor_nerve", "target": "medial_rectus", "relation": "innervates"},
    ]
    return {"nodes": nodes, "edges": edges}


def look_up_graph() -> Graph:
    nodes = [
        {"id": "motor_cortex", "type": "brain_region", "label": "Motor Cortex"},
        {"id": "oculomotor_nerve", "type": "nerve", "label": "Oculomotor Nerve (III)"},
        {"id": "trochlear_nerve", "type": "nerve", "label": "Trochlear Nerve (IV)"},
        {"id": "superior_rectus", "type": "muscle", "label": "Superior Rectus"},
        {"id": "inferior_oblique", "type": "muscle", "label": "Inferior Oblique"},
    ]
    edges = [
        {"source": "motor_cortex", "target": "oculomotor_nerve", "relation": "sends_signal"},
        {"source": "motor_cortex", "target": "trochlear_nerve", "relation": "sends_signal"},
        {"source": "oculomotor_nerve", "target": "superior_rectus", "relation": "innervates"},
        {"source": "oculomotor_nerve", "target": "inferior_oblique", "relation": "innervates"},
    ]
    return {"nodes": nodes, "edges": edges}


def look_down_graph() -> Graph:
    nodes = [
        {"id": "motor_cortex", "type": "brain_region", "label": "Motor Cortex"},
        {"id": "oculomotor_nerve", "type": "nerve", "label": "Oculomotor Nerve (III)"},
        {"id": "trochlear_nerve", "type": "nerve", "label": "Trochlear Nerve (IV)"},
        {"id": "inferior_rectus", "type": "muscle", "label": "Inferior Rectus"},
        {"id": "superior_oblique", "type": "muscle", "label": "Superior Oblique"},
    ]
    edges = [
        {"source": "motor_cortex", "target": "oculomotor_nerve", "relation": "sends_signal"},
        {"source": "motor_cortex", "target": "trochlear_nerve", "relation": "sends_signal"},
        {"source": "oculomotor_nerve", "target": "inferior_rectus", "relation": "innervates"},
        {"source": "trochlear_nerve", "target": "superior_oblique", "relation": "innervates"},
    ]
    return {"nodes": nodes, "edges": edges}


def raise_eyebrows_graph() -> Graph:
    nodes = [
        {"id": "motor_cortex", "type": "brain_region", "label": "Motor Cortex"},
        {"id": "facial_nerve", "type": "nerve", "label": "Facial Nerve (VII)"},
        {"id": "frontalis", "type": "muscle", "label": "Frontalis"},
    ]
    edges = [
        {"source": "motor_cortex", "target": "facial_nerve", "relation": "sends_signal"},
        {"source": "facial_nerve", "target": "frontalis", "relation": "innervates"},
    ]
    return {"nodes": nodes, "edges": edges}


def frown_graph() -> Graph:
    nodes = [
        {"id": "prefrontal_cortex", "type": "brain_region", "label": "Prefrontal Cortex"},
        {"id": "motor_cortex", "type": "brain_region", "label": "Motor Cortex"},
        {"id": "facial_nerve", "type": "nerve", "label": "Facial Nerve (VII)"},
        {"id": "corrugator_supercilii", "type": "muscle", "label": "Corrugator Supercilii"},
    ]
    edges = [
        {"source": "prefrontal_cortex", "target": "motor_cortex", "relation": "plans_expression"},
        {"source": "motor_cortex", "target": "facial_nerve", "relation": "sends_signal"},
        {"source": "facial_nerve", "target": "corrugator_supercilii", "relation": "innervates"},
    ]
    return {"nodes": nodes, "edges": edges}


def supported_graphs() -> Dict[str, Callable[[], Graph]]:
    return {
        "smile": smile_graph,
        "smiling": smile_graph,
        "chew": chew_graph,
        "chewing": chew_graph,
        "mastication": chew_graph,
        "speak": speak_graph,
        "speech": speak_graph,
        "talk": speak_graph,
        "blink": blink_graph,
        "swallow": swallow_graph,
        "deglutition": swallow_graph,
        "look_left": look_left_graph,
        "look_right": look_right_graph,
        "look_up": look_up_graph,
        "look_down": look_down_graph,
        "raise_eyebrows": raise_eyebrows_graph,
        "frown": frown_graph,
    }
