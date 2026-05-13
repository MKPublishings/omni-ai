import { P1ContactModule } from "../P1-contact/index.js";
import { P2OperationalModule } from "../P2-operational/index.js";
import { P3ManagerialModule } from "../P3-managerial/index.js";
import { P4DirectiveModule } from "../P4-directive/index.js";
import { P5OversightModule } from "../P5-oversight/index.js";
import { P6LegalityModule } from "../P6-legality/index.js";
import { P7SocietalModule } from "../P7-societal/index.js";
import { P8SovereignModule } from "../P8-sovereign/index.js";
import { hierarchyEngine } from "../core/hierarchy-engine.js";

export const hierarchyModules = [
  P8SovereignModule.manifest,
  P7SocietalModule.manifest,
  P6LegalityModule.manifest,
  P5OversightModule.manifest,
  P4DirectiveModule.manifest,
  P3ManagerialModule.manifest,
  P2OperationalModule.manifest,
  P1ContactModule.manifest
];

export async function registerAllPoints(): Promise<void> {
  hierarchyEngine.initialize();
  await hierarchyEngine.registerModules(hierarchyModules);
}