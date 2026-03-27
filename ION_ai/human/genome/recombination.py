from __future__ import annotations

from random import Random

from .gamete import Gamete
from .genome import Gene, Genome


def _clamp_unit(value: float) -> float:
    return max(0.0, min(1.0, value))


def recombine_gametes(gamete_a: Gamete, gamete_b: Gamete, rng: Random | None = None) -> Genome:
    random = rng or Random()
    gene_names = set(gamete_a.alleles.keys()) | set(gamete_b.alleles.keys())
    genes = {}

    for name in gene_names:
        maternal = gamete_a.alleles.get(name, 0.5)
        paternal = gamete_b.alleles.get(name, 0.5)

        mutation_rate = max(
            gamete_a.mutation_rate_by_gene.get(name, 0.01),
            gamete_b.mutation_rate_by_gene.get(name, 0.01),
        )
        mutation_scale = max(
            gamete_a.mutation_scale_by_gene.get(name, 0.03),
            gamete_b.mutation_scale_by_gene.get(name, 0.03),
        )

        if random.random() < mutation_rate:
            maternal = _clamp_unit(maternal + random.uniform(-mutation_scale, mutation_scale))
        if random.random() < mutation_rate:
            paternal = _clamp_unit(paternal + random.uniform(-mutation_scale, mutation_scale))

        genes[name] = Gene(
            name=name,
            maternal=maternal,
            paternal=paternal,
            dominance="average",
            mutation_rate=mutation_rate,
            mutation_scale=mutation_scale,
        )

    return Genome(genes=genes)
