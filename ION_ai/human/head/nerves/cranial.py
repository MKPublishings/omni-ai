from __future__ import annotations

from typing import Dict

from ION_ai.human.head.models import CranialNerve

CRANIAL_NERVES: Dict[int, CranialNerve] = {
    1: CranialNerve(
        number=1,
        name="Olfactory",
        nerve_type="sensory",
        functions=["smell"],
        targets=["olfactory_epithelium"],
    ),
    2: CranialNerve(
        number=2,
        name="Optic",
        nerve_type="sensory",
        functions=["vision"],
        targets=["retina"],
    ),
    3: CranialNerve(
        number=3,
        name="Oculomotor",
        nerve_type="motor",
        functions=["most extraocular movements", "pupil constriction", "eyelid elevation"],
        targets=["superior_rectus", "inferior_rectus", "medial_rectus", "inferior_oblique", "levator_palpebrae", "sphincter_pupillae"],
    ),
    4: CranialNerve(
        number=4,
        name="Trochlear",
        nerve_type="motor",
        functions=["superior oblique activation"],
        targets=["superior_oblique"],
    ),
    5: CranialNerve(
        number=5,
        name="Trigeminal",
        nerve_type="mixed",
        functions=["facial sensation", "mastication"],
        targets=["face", "cornea", "masseter", "temporalis", "pterygoids"],
    ),
    6: CranialNerve(
        number=6,
        name="Abducens",
        nerve_type="motor",
        functions=["lateral eye abduction"],
        targets=["lateral_rectus"],
    ),
    7: CranialNerve(
        number=7,
        name="Facial",
        nerve_type="mixed",
        functions=["facial expression", "taste anterior two-thirds tongue", "lacrimation", "salivation"],
        targets=["facial_muscles", "lacrimal_gland", "submandibular_gland", "sublingual_gland"],
    ),
    8: CranialNerve(
        number=8,
        name="Vestibulocochlear",
        nerve_type="sensory",
        functions=["hearing", "balance"],
        targets=["cochlea", "vestibular_apparatus"],
    ),
    9: CranialNerve(
        number=9,
        name="Glossopharyngeal",
        nerve_type="mixed",
        functions=["taste posterior one-third tongue", "swallowing", "parotid salivation"],
        targets=["posterior_tongue", "stylopharyngeus", "parotid_gland"],
    ),
    10: CranialNerve(
        number=10,
        name="Vagus",
        nerve_type="mixed",
        functions=["laryngeal control", "pharyngeal sensation", "parasympathetic output"],
        targets=["larynx", "pharynx", "thoracoabdominal_viscera"],
    ),
    11: CranialNerve(
        number=11,
        name="Accessory",
        nerve_type="motor",
        functions=["head turn", "shoulder elevation"],
        targets=["sternocleidomastoid", "trapezius"],
    ),
    12: CranialNerve(
        number=12,
        name="Hypoglossal",
        nerve_type="motor",
        functions=["tongue movement"],
        targets=["intrinsic_tongue_muscles", "extrinsic_tongue_muscles"],
    ),
}
