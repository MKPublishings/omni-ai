// src/utils/validation.ts

import { IONRequest } from "../api/ION/index";

export function validateMessages(body: IONRequest): string | null {
  if (!body) return "Missing request body";

  if (!Array.isArray(body.messages)) {
    return "Invalid messages array";
  }

  if (body.messages.length === 0) {
    return "Messages cannot be empty";
  }

  for (const msg of body.messages) {
    const role = String(msg?.role || "").trim();
    const content = String(msg?.content || "").trim();
    if (!role || !content) {
      return "Each message must include role and content";
    }

    if (!["system", "user", "assistant"].includes(role)) {
      return "Message role must be one of: system, user, assistant";
    }
  }

  if (!body.model) return "Missing model";
  if (!body.mode) return "Missing mode";

  return null;
}