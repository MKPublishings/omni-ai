from __future__ import annotations

from dataclasses import dataclass, field
from random import Random
from typing import Dict, List, Literal


DominanceMode = Literal["average", "maternal", "paternal"]


def _clamp_unit(value: float) -> float:
    return max(0.0, min(1.0, value))


@dataclass
class Chromosome:
    name: str
    domain: Literal["physical", "cognitive", "personality", "reproductive"]
    genes: List[str] = field(default_factory=list)


@dataclass
class Gene:
    name: str
    maternal: float
    paternal: float
    dominance: DominanceMode = "average"
    mutation_rate: float = 0.01
    mutation_scale: float = 0.03

    def express(self) -> float:
        if self.dominance == "maternal":
            return _clamp_unit(self.maternal)
        if self.dominance == "paternal":
            return _clamp_unit(self.paternal)
        return _clamp_unit((self.maternal + self.paternal) / 2.0)


@dataclass
class Genome:
    genes: Dict[str, Gene] = field(default_factory=dict)
    chromosomes: Dict[str, Chromosome] = field(default_factory=dict)

    def express(self) -> Dict[str, float]:
        return {name: gene.express() for name, gene in self.genes.items()}


def build_full_scale_schema() -> Dict[str, Chromosome]:
    return {
        "A": Chromosome(
            name="A",
            domain="physical",
            genes=["physical_height", "physical_limb_proportion", "physical_structural_resilience"],
        ),
        "B": Chromosome(
            name="B",
            domain="physical",
            genes=["physical_muscle_density", "physical_metabolic_efficiency", "physical_lung_capacity"],
        ),
        "C": Chromosome(
            name="C",
            domain="physical",
            genes=["physical_facial_morphology", "physical_sensory_acuity", "physical_growth_curve"],
        ),
        "D": Chromosome(
            name="D",
            domain="cognitive",
            genes=["cognitive_working_memory", "cognitive_processing_speed", "cognitive_pattern_recognition"],
        ),
        "E": Chromosome(
            name="E",
            domain="cognitive",
            genes=["cognitive_reasoning_style", "cognitive_risk_evaluation", "cognitive_attention_control"],
        ),
        "F": Chromosome(
            name="F",
            domain="personality",
            genes=["personality_cooperation", "personality_emotional_regulation", "personality_motivation_drive"],
        ),
        "G": Chromosome(
            name="G",
            domain="personality",
            genes=["personality_adaptability", "personality_social_orientation", "personality_temperament_stability"],
        ),
        "H": Chromosome(
            name="H",
            domain="reproductive",
            genes=["reproductive_anatomy_index", "reproductive_fertility_window", "reproductive_gamete_stability"],
        ),
    }


def build_default_genome(rng: Random | None = None) -> Genome:
    random = rng or Random()
    schema = build_full_scale_schema()
    genes: Dict[str, Gene] = {}
    for chromosome in schema.values():
        for name in chromosome.genes:
            genes[name] = Gene(
                name=name,
                maternal=random.uniform(0.35, 0.65),
                paternal=random.uniform(0.35, 0.65),
                dominance="average",
                mutation_rate=0.01,
                mutation_scale=0.03,
            )
    return Genome(genes=genes, chromosomes=schema)
