// @ts-check

/** @param {string} text */
function normalizeResponseText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{5,}/g, "\n\n\n\n")
    .trim();
}

/** @param {string} text @param {{ mode?: string, stabilityMode?: boolean }} [options] */
export function formatResponse(text, options = {}) {
  const raw = String(text || "").trim();
  if (!raw) return "No response generated.";

  void options;

  return normalizeResponseText(raw);
}

/** @param {string} text */
export function toHtmlWithBasicHighlight(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_m, lang, code) => {
      const language = lang || "code";
      return `<pre class=\"code-block\" data-lang=\"${language}\"><code>${code}</code></pre>`;
    });
}
