from __future__ import annotations

from dataclasses import dataclass
from random import Random
from typing import List

from ..environment import Environment
from ..genome import Genome, build_default_genome, make_gamete, recombine_gametes
from ..instance import HumanInstance


@dataclass
class PopulationManager:
    rng: Random

    def create_founders(self, count: int, environment: Environment) -> List[HumanInstance]:
        members: List[HumanInstance] = []
        for idx in range(count):
            genome = build_default_genome(self.rng)
            members.append(HumanInstance.develop(id=f"human-{idx:05d}", genome=genome, environment=environment))
        return members

    def replicate_child(self, parent_a: HumanInstance, parent_b: HumanInstance, child_id: str, environment: Environment) -> HumanInstance:
        gamete_a = make_gamete(parent_a.genome, self.rng)
        gamete_b = make_gamete(parent_b.genome, self.rng)
        child_genome: Genome = recombine_gametes(gamete_a, gamete_b, self.rng)
        return HumanInstance.develop(id=child_id, genome=child_genome, environment=environment)

    def expand_population(self, founders: List[HumanInstance], target_size: int, environment: Environment) -> List[HumanInstance]:
        if target_size <= len(founders):
            return founders[:target_size]

        members = list(founders)
        while len(members) < target_size:
            parent_a = members[self.rng.randrange(0, len(founders))]
            parent_b = members[self.rng.randrange(0, len(founders))]
            child = self.replicate_child(
                parent_a=parent_a,
                parent_b=parent_b,
                child_id=f"human-{len(members):05d}",
                environment=environment,
            )
            members.append(child)
        return members

    def run_longitudinal_progression(self, members: List[HumanInstance], years: int, environment: Environment) -> None:
        if years <= 0:
            return
        for member in members:
            member.progress_years(years=years, environment=environment)
