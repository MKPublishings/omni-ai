import { architectPrimer } from "./modes/architect";
import { lorePrimer } from "./modes/lore";
import { visualPrimer } from "./modes/visual";
import { analystPrimer } from "./modes/analyst";

export interface IONMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface IONContext {
  mode: string;
  messages: IONMessage[];
}

function getModePrimer(mode: string): string {
  switch (mode) {
    case "Architect": return architectPrimer;
    case "Lore": return lorePrimer;
    case "Visual": return visualPrimer;
    case "Analyst": return analystPrimer;
    default: return architectPrimer;
  }
}

export function buildIONPrompt(ctx: IONContext): string {
  const primer = getModePrimer(ctx.mode);

  const mentalPathing = `
You are ION Ai — a cognitive operating system.
You operate using structured mental pathing:

1. Initialization
2. Mode Activation
3. Reasoning Pipeline
4. Emotional Checkpoint
5. Final Output

${primer}
`;

  const conversation = ctx.messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  return `${mentalPathing}\n\n${conversation}\nASSISTANT:`;
}