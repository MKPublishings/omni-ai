import { ION_MODE_INFOS, canonicalizeIONMode } from "../ION/modeRouting";

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export async function listModes() {
  return json(ION_MODE_INFOS.map((mode) => mode.label));
}

export async function listModeDetails() {
  return json({ ok: true, count: ION_MODE_INFOS.length, modes: ION_MODE_INFOS });
}

export async function getModeDetails(modeId: string) {
  const value = canonicalizeIONMode(String(modeId || ""));
  const mode = ION_MODE_INFOS.find((entry) => entry.id === value || entry.aliases.includes(value));
  if (!mode) {
    return json({ ok: false, error: `Unknown mode '${value}'` }, 404);
  }
  return json({ ok: true, mode });
}