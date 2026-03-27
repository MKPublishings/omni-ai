from __future__ import annotations

from dataclasses import dataclass, field
from random import Random
from typing import Dict

from .genome import Genome


@dataclass
class Gamete:
    alleles: Dict[str, float] = field(default_factory=dict)
    mutation_rate_by_gene: Dict[str, float] = field(default_factory=dict)
    mutation_scale_by_gene: Dict[str, float] = field(default_factory=dict)


def make_gamete(genome: Genome, rng: Random | None = None) -> Gamete:
    random = rng or Random()
    alleles: Dict[str, float] = {}
    mutation_rate_by_gene: Dict[str, float] = {}
    mutation_scale_by_gene: Dict[str, float] = {}

    for gene_name, gene in genome.genes.items():
        inherited = gene.maternal if random.random() < 0.5 else gene.paternal
        alleles[gene_name] = inherited
        mutation_rate_by_gene[gene_name] = gene.mutation_rate
        mutation_scale_by_gene[gene_name] = gene.mutation_scale

    return Gamete(
        alleles=alleles,
        mutation_rate_by_gene=mutation_rate_by_gene,
        mutation_scale_by_gene=mutation_scale_by_gene,
    )
