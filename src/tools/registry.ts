import { now } from "../utils/time";

export const IONTools = {
  time: {
    name: "time",
    description: "Returns the current ISO timestamp.",
    run: async () => now()
  },

  echo: {
    name: "echo",
    description: "Returns the same text back.",
    run: async (input: string) => input
  }
};

export function getTool(name: string) {
  return IONTools[name as keyof typeof IONTools] || null;
}