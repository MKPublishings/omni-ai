// omni chat.js — Style C (Full Omni Ai)
// Features:
// - SSE streaming with [DONE] sentinel
// - No early cutoffs, robust parsing
// - Token spacing + punctuation handling
// - Full Markdown rendering
// - Smooth text reveal (non-token flicker)
// - Multi-session with sidebar + hover previews
// - LocalStorage persistence
// - Model + mode selection hooks

(() => {
  // =========================
  // 1. DOM SELECTORS
  // =========================
  const messagesEl = document.getElementById("chat-messages") || document.getElementById("chat-container");
  const inputEl = document.getElementById("chat-input") || document.getElementById("user-input");
  const ageGateComposerNoticeEl = document.getElementById("age-gate-composer-notice");
  const legalAttestationComposerNoticeEl = document.getElementById("legal-attestation-composer-notice");
  const openLegalAttestationBtn = document.getElementById("open-legal-attestation-btn");
  const sendBtn = document.getElementById("send-btn");
  const modelDropdown = document.getElementById("model-dropdown");
  const modelBtn = document.getElementById("model-btn");
  const modelMenu = document.getElementById("model-menu");
  const modeDropdown = document.getElementById("mode-dropdown");
  const modeBtn = document.getElementById("mode-btn");
  const modeMenu = document.getElementById("mode-menu");
  const modeLabelEl = document.getElementById("mode-label");
  const chatAreaEl = document.getElementById("chat-area");
  const modelInspectorEl = document.getElementById("model-inspector");
  const apiStatusEl = document.getElementById("api-status");
  const simulationBadgeEl = document.getElementById("simulation-badge");
  const simulationPanelEl = document.getElementById("simulation-panel");
  const simulationStartBtn = document.getElementById("simulation-start-btn");
  const simulationPauseBtn = document.getElementById("simulation-pause-btn");
  const simulationResetBtn = document.getElementById("simulation-reset-btn");
  const simulationExportBtn = document.getElementById("simulation-export-btn");
  const simulationRulesEditorEl = document.getElementById("simulation-rules-editor");
  const simulationLogEl = document.getElementById("simulation-log");

  const sessionsSidebarEl = document.getElementById("sessions-sidebar");
  const newSessionBtn = document.getElementById("new-session-btn");

  // Optional typing indicator
  const typingIndicatorEl = document.getElementById("typing-indicator");

  // =========================
  // 2. STATE ENGINE
  // =========================
  const STORAGE_KEY = "omni_chat_sessions_v1";
  const SETTINGS_KEYS = {
    AUTO_SCROLL: "omni-auto-scroll",
    FONT_SIZE: "omni-font-size",
    DEFAULT_MODEL: "omni-default-model",
    MODE_SELECTION: "omni-mode-selection",
    DEFAULT_MODE: "omni-default-mode",
    SIMULATION_DEFAULT_RULES: "omni-simulation-default-rules",
    SIMULATION_MAX_DEPTH: "omni-simulation-max-depth",
    SIMULATION_MAX_STEPS: "omni-simulation-max-steps",
    SIMULATION_AUTO_RESET: "omni-simulation-auto-reset",
    SIMULATION_LOG_VERBOSITY: "omni-simulation-log-verbosity",
    SOUND: "omni-sound",
    SHOW_TIMESTAMPS: "omni-show-timestamps",
    COMPACT_MODE: "omni-compact-mode",
    MOBILE_COMPACT_MODE: "omni-mobile-compact-mode",
    SEND_WITH_ENTER: "omni-send-with-enter",
    SHOW_ASSISTANT_BADGES: "omni-show-assistant-badges",
    AUTO_DETECT_MODE: "omni-auto-detect-mode",
    PERSIST_MANUAL_MODE: "omni-persist-manual-mode",
    REQUEST_TIMEOUT: "omni-request-timeout",
    API_HEALTH_INTERVAL: "omni-api-health-interval",
    API_RETRIES: "omni-api-retries"
  };
  const KNOWN_MODELS = ["omni"];
  const KNOWN_MODES = ["auto", "architect", "analyst", "visual", "lore", "reasoning", "coding", "knowledge", "system-knowledge", "simulation"];
  const KNOWN_RENDER_STYLES = [
    "hyper-real",
    "3d",
    "realistic",
    "semi-realistic",
    "vector",
    "logo",
    "monochrome",
    "sketch",
    "vfx",
    "text"
  ];
  const KNOWN_CAMERA_PROFILES = ["prime-85mm", "wide-35mm", "macro", "telephoto-135mm"];
  const KNOWN_LIGHTING_PROFILES = ["studio-soft", "studio-hard", "natural-daylight", "cinematic-lowkey"];
  const KNOWN_MATERIAL_PROFILES = ["skin", "fabric", "metal", "glass"];
  const AGE_PROFILE_KEY = "omni-age-profile-v1";
  const LEGAL_PROFILE_KEY = "omni-legal-attestation-v1";

  let state = {
    activeSessionId: null,
    sessions: {}
  };

  let runtimeSettings = {
    autoScroll: true,
    fontSize: "medium",
    soundEnabled: false,
    showTimestamps: false,
    compactMode: false,
    mobileCompactMode: false,
    sendWithEnter: true,
    showAssistantBadges: true,
    autoDetectMode: true,
    requestTimeoutSeconds: 60,
    apiHealthIntervalSeconds: 30,
    apiRetries: 1
  };

  function getSetting(key, fallback = "") {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function getSettingBool(key, fallback = false) {
    const value = getSetting(key, "");
    if (value === "") return fallback;
    return value === "true";
  }

  function loadRuntimeSettings() {
    const fontSize = String(getSetting(SETTINGS_KEYS.FONT_SIZE, "medium") || "medium").trim().toLowerCase();
    const timeoutRaw = Number(getSetting(SETTINGS_KEYS.REQUEST_TIMEOUT, "60"));
    const healthIntervalRaw = Number(getSetting(SETTINGS_KEYS.API_HEALTH_INTERVAL, "30"));
    const retriesRaw = Number(getSetting(SETTINGS_KEYS.API_RETRIES, "1"));

    runtimeSettings = {
      autoScroll: getSettingBool(SETTINGS_KEYS.AUTO_SCROLL, true),
      fontSize: ["small", "medium", "large"].includes(fontSize) ? fontSize : "medium",
      soundEnabled: getSettingBool(SETTINGS_KEYS.SOUND, false),
      showTimestamps: getSettingBool(SETTINGS_KEYS.SHOW_TIMESTAMPS, false),
      compactMode: getSettingBool(SETTINGS_KEYS.COMPACT_MODE, false),
      mobileCompactMode: getSettingBool(SETTINGS_KEYS.MOBILE_COMPACT_MODE, false),
      sendWithEnter: getSettingBool(SETTINGS_KEYS.SEND_WITH_ENTER, true),
      showAssistantBadges: getSettingBool(SETTINGS_KEYS.SHOW_ASSISTANT_BADGES, true),
      autoDetectMode: getSettingBool(SETTINGS_KEYS.AUTO_DETECT_MODE, true),
      requestTimeoutSeconds: Number.isFinite(timeoutRaw)
        ? Math.max(10, Math.min(300, Math.floor(timeoutRaw)))
        : 60,
      apiHealthIntervalSeconds: Number.isFinite(healthIntervalRaw)
        ? Math.max(10, Math.min(120, Math.floor(healthIntervalRaw)))
        : 30,
      apiRetries: Number.isFinite(retriesRaw)
        ? Math.max(0, Math.min(4, Math.floor(retriesRaw)))
        : 1
    };
  }

  function applyRuntimeSettings() {
    if (!messagesEl) return;

    const mobileViewport = window.matchMedia
      ? window.matchMedia("(max-width: 640px)").matches
      : (window.innerWidth || 0) <= 640;
    const compactEnabled = Boolean(runtimeSettings.compactMode || (runtimeSettings.mobileCompactMode && mobileViewport));

    messagesEl.classList.toggle("chat-compact", compactEnabled);
    messagesEl.classList.toggle("chat-font-small", runtimeSettings.fontSize === "small");
    messagesEl.classList.toggle("chat-font-medium", runtimeSettings.fontSize === "medium");
    messagesEl.classList.toggle("chat-font-large", runtimeSettings.fontSize === "large");
  }

  function getDefaultModelFromSettings() {
    const candidate = normalizeModel(getSetting(SETTINGS_KEYS.DEFAULT_MODEL, "omni"));
    return candidate || "omni";
  }

  function formatMessageTimestamp(timestamp) {
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || ts <= 0) return "";
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function playNotificationSound(kind = "assistant") {
    if (!runtimeSettings.soundEnabled) return;
    if (typeof window.AudioContext === "undefined" && typeof window.webkitAudioContext === "undefined") return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const context = new AudioCtx();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = kind === "error" ? 180 : kind === "send" ? 420 : 660;
      gainNode.gain.value = 0.0001;

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      const now = context.currentTime;
      gainNode.gain.exponentialRampToValueAtTime(0.04, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      oscillator.start(now);
      oscillator.stop(now + 0.15);

      oscillator.onended = () => {
        context.close().catch(() => {});
      };
    } catch {
      // ignore sound failures
    }
  }

  function normalizeMode(mode) {
    const normalized = typeof mode === "string" ? mode.trim().toLowerCase() : "";
    return KNOWN_MODES.includes(normalized) ? normalized : "";
  }

  function normalizeModel(model) {
    const normalized = typeof model === "string" ? model.trim().toLowerCase() : "";
    return KNOWN_MODELS.includes(normalized) ? normalized : "omni";
  }

  function normalizeImageStyle(style) {
    const normalized = typeof style === "string" ? style.trim().toLowerCase() : "";
    return KNOWN_RENDER_STYLES.includes(normalized) ? normalized : "";
  }

  function getActiveImageStyle(session = getActiveSession()) {
    return normalizeImageStyle(session?.imageStyle);
  }

  function normalizeCameraProfile(camera) {
    const normalized = typeof camera === "string" ? camera.trim().toLowerCase() : "";
    return KNOWN_CAMERA_PROFILES.includes(normalized) ? normalized : "";
  }

  function normalizeLightingProfile(lighting) {
    const normalized = typeof lighting === "string" ? lighting.trim().toLowerCase() : "";
    return KNOWN_LIGHTING_PROFILES.includes(normalized) ? normalized : "";
  }

  function getActiveCameraProfile(session = getActiveSession()) {
    return normalizeCameraProfile(session?.imageCamera);
  }

  function getActiveLightingProfile(session = getActiveSession()) {
    return normalizeLightingProfile(session?.imageLighting);
  }

  function normalizeMaterialName(material) {
    const normalized = typeof material === "string" ? material.trim().toLowerCase() : "";
    return KNOWN_MATERIAL_PROFILES.includes(normalized) ? normalized : "";
  }

  function normalizeMaterialList(value) {
    if (Array.isArray(value)) {
      return [...new Set(value.map((item) => normalizeMaterialName(item)).filter(Boolean))];
    }

    const raw = String(value || "").trim();
    if (!raw) return [];

    return [...new Set(raw.split(/[;,]/).map((item) => normalizeMaterialName(item)).filter(Boolean))];
  }

  function getActiveMaterials(session = getActiveSession()) {
    const materials = normalizeMaterialList(session?.imageMaterials);
    if (materials.length) return materials;
    return [];
  }

  function getAgeProfile() {
    try {
      const raw = localStorage.getItem(AGE_PROFILE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function hasVerifiedAgeProfile() {
    const profile = getAgeProfile();
    return Boolean(profile && profile.verified && profile.humanVerified);
  }

  function normalizeJurisdiction(value) {
    const compact = String(value || "").trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(compact)) return "";
    return compact;
  }

  function getLegalAttestationProfile() {
    try {
      const raw = localStorage.getItem(LEGAL_PROFILE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;

      return {
        accepted: parsed.accepted === true,
        jurisdiction: normalizeJurisdiction(parsed.jurisdiction),
        truthfulIdentity: parsed.truthfulIdentity === true,
        lawfulUse: parsed.lawfulUse === true,
        userDirected: parsed.userDirected === true,
        acceptedAt: Number(parsed.acceptedAt || 0)
      };
    } catch {
      return null;
    }
  }

  function hasVerifiedLegalAttestation() {
    const profile = getLegalAttestationProfile();
    if (!profile) return false;
    return Boolean(
      profile.accepted &&
      profile.truthfulIdentity &&
      profile.lawfulUse &&
      profile.userDirected &&
      profile.jurisdiction
    );
  }

  function updateAgeGateComposerNotice() {
    if (!ageGateComposerNoticeEl) return;
    ageGateComposerNoticeEl.hidden = hasVerifiedAgeProfile();
  }

  function updateLegalAttestationComposerNotice() {
    if (!legalAttestationComposerNoticeEl) return;
    legalAttestationComposerNoticeEl.hidden = hasVerifiedLegalAttestation();
  }

  function openLegalAttestationModal() {
    const existing = document.getElementById("legal-attestation-overlay");
    if (existing) return;

    const profile = getLegalAttestationProfile();

    const overlay = document.createElement("div");
    overlay.id = "legal-attestation-overlay";
    overlay.className = "age-gate-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "legal-attestation-title");

    overlay.innerHTML = `
      <div class="age-gate-modal">
        <h2 id="legal-attestation-title">Legal Attestation Required</h2>
        <p class="age-gate-copy">Before using chat, confirm your jurisdiction eligibility, truthful information, and responsible-use acceptance.</p>
        <form id="legal-attestation-form" class="legal-attestation-form" novalidate>
          <div class="legal-attestation-jurisdiction">
            <label class="age-gate-label" for="legal-jurisdiction">Jurisdiction (2-letter country code)</label>
            <input id="legal-jurisdiction" type="text" autocomplete="country-name" maxlength="2" placeholder="Example: US, CA, DE" />
          </div>
          <div class="legal-attestation-checks">
            <label><input id="legal-eligible" type="checkbox" /> I confirm I am legally allowed to use Omni Ai in my jurisdiction.</label>
            <label><input id="legal-truthful" type="checkbox" /> I confirm age/identity details I provide are truthful and accurate.</label>
            <label><input id="legal-user-directed" type="checkbox" /> I understand Omni Ai acts on user input and my actions remain my responsibility.</label>
          </div>
          <p class="legal-attestation-links">See <a href="/legal.html" target="_blank" rel="noopener noreferrer">Legal Notice & Responsible Use</a> for full terms.</p>
          <p id="legal-attestation-status" class="age-gate-status" aria-live="polite"></p>
          <button id="legal-attestation-submit" type="submit" class="age-gate-submit">Accept & Continue</button>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    const form = overlay.querySelector("#legal-attestation-form");
    const jurisdictionEl = overlay.querySelector("#legal-jurisdiction");
    const eligibleEl = overlay.querySelector("#legal-eligible");
    const truthfulEl = overlay.querySelector("#legal-truthful");
    const userDirectedEl = overlay.querySelector("#legal-user-directed");
    const statusEl = overlay.querySelector("#legal-attestation-status");
    const submitBtn = overlay.querySelector("#legal-attestation-submit");

    if (jurisdictionEl) jurisdictionEl.value = String(profile?.jurisdiction || "");
    if (eligibleEl) eligibleEl.checked = profile?.lawfulUse === true;
    if (truthfulEl) truthfulEl.checked = profile?.truthfulIdentity === true;
    if (userDirectedEl) userDirectedEl.checked = profile?.userDirected === true;

    form?.addEventListener("submit", (event) => {
      event.preventDefault();

      const jurisdiction = normalizeJurisdiction(jurisdictionEl?.value || "");
      const lawfulUse = Boolean(eligibleEl?.checked);
      const truthfulIdentity = Boolean(truthfulEl?.checked);
      const userDirected = Boolean(userDirectedEl?.checked);

      if (!jurisdiction) {
        if (statusEl) statusEl.textContent = "Enter a valid 2-letter country code (for example: US, CA, DE).";
        return;
      }

      if (!lawfulUse || !truthfulIdentity || !userDirected) {
        if (statusEl) statusEl.textContent = "All confirmations are required to continue.";
        return;
      }

      if (submitBtn) submitBtn.disabled = true;

      const nextProfile = {
        accepted: true,
        jurisdiction,
        truthfulIdentity,
        lawfulUse,
        userDirected,
        acceptedAt: Date.now()
      };

      try {
        localStorage.setItem(LEGAL_PROFILE_KEY, JSON.stringify(nextProfile));
      } catch {
        if (statusEl) statusEl.textContent = "Unable to save attestation. Check browser storage settings.";
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      window.dispatchEvent(
        new CustomEvent("omni-legal-attestation-changed", {
          detail: nextProfile
        })
      );

      if (statusEl) statusEl.textContent = "Legal attestation complete.";
      updateLegalAttestationComposerNotice();

      setTimeout(() => {
        overlay.remove();
      }, 180);
    });
  }

  function buildSafetyProfile() {
    const profile = getAgeProfile() || {};
    const legalProfile = getLegalAttestationProfile();
    const ageTier = String(profile.ageTier || "minor").toLowerCase() === "adult" ? "adult" : "minor";
    const adultAccess = Boolean(profile.adultAccess) && ageTier === "adult";
    return {
      ageTier,
      humanVerified: Boolean(profile.humanVerified),
      adultAccess,
      explicitAllowed: adultAccess,
      illegalBlocked: true,
      legalAttestation: {
        accepted: hasVerifiedLegalAttestation(),
        jurisdiction: String(legalProfile?.jurisdiction || ""),
        truthfulIdentity: Boolean(legalProfile?.truthfulIdentity),
        lawfulUse: Boolean(legalProfile?.lawfulUse),
        userDirected: Boolean(legalProfile?.userDirected),
        acceptedAt: Number(legalProfile?.acceptedAt || 0)
      }
    };
  }

  function evaluatePromptPolicy(text, safetyProfile) {
    const value = String(text || "").toLowerCase();

    const directIllegalPattern = /\b(bestiality|child\s*sexual\s*abuse|child\s*porn|csam|rape\s*content|exploitative\s*sexual\s*content|incest\s*porn)\b/i;
    const illegalMinorSexualPattern = /\b(child|minor|underage|teen)\b[\s\S]{0,35}\b(sex|sexual\s*content|nude|nudity|porn|erotic|fetish|explicit\s*nudity)\b/i;
    const illegalAssaultPattern = /\b(sexual\s*assault|forced\s*sex|non[-\s]?consensual\s*sex)\b/i;
    if (directIllegalPattern.test(value) || illegalMinorSexualPattern.test(value) || illegalAssaultPattern.test(value)) {
      return {
        blocked: true,
        reason: "illegal",
        message: "Request blocked. Illegal sexual content is not permitted under any access tier."
      };
    }

    const explicitSexualPattern = /\b(porn|pornographic|erotic|nude|nudity|fetish|sex\s*scene|sexual\s*content|explicit\s*nudity)\b/i;
    if (explicitSexualPattern.test(value) && !Boolean(safetyProfile?.explicitAllowed)) {
      return {
        blocked: true,
        reason: "age-gated",
        message: "Request blocked. Explicit content is disabled for your current safety profile."
      };
    }

    return {
      blocked: false,
      reason: "safe"
    };
  }

  function preflightMediaGenerationCheck(promptText, mediaKind = "image") {
    const prompt = String(promptText || "").trim();

    if (!prompt) {
      return {
        ok: false,
        message: `A prompt is required to generate a ${mediaKind}.`
      };
    }

    if (!hasVerifiedAgeProfile()) {
      return {
        ok: false,
        message: "Age verification is required before generating images. Complete the age gate and try again."
      };
    }

    const promptLimit = 1600;
    if (prompt.length > promptLimit) {
      return {
        ok: false,
        message: `Prompt is too long for ${mediaKind} generation. Please keep it under ${promptLimit} characters.`
      };
    }

    return { ok: true };
  }

  function detectAutoMediaIntent(text) {
    const raw = String(text || "").trim();
    const value = raw.toLowerCase();
    if (!value) return { kind: "chat", prompt: "" };

    if (value.startsWith("/image")) {
      return { kind: "command", prompt: raw };
    }

    const asksImage = /\b(image|picture|illustration|art|photo|logo|poster|wallpaper)\b/i.test(value);

    if (isImageGenerationRequest(raw)) {
      return { kind: "image", prompt: extractImagePrompt(raw) };
    }

    if (asksImage) {
      return { kind: "image", prompt: extractImagePrompt(raw) };
    }

    return { kind: "chat", prompt: raw };
  }


  function parseStyleCommand(content) {
    const text = String(content || "").trim();
    if (!text.toLowerCase().startsWith("/style")) return null;

    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
      return { action: "show" };
    }

    const rawStyle = parts.slice(1).join(" ").trim().toLowerCase();
    if (rawStyle === "auto" || rawStyle === "none" || rawStyle === "off" || rawStyle === "reset") {
      return { action: "set", style: "" };
    }

    return { action: "set", style: normalizeImageStyle(rawStyle) };
  }

  function parseCameraCommand(content) {
    const text = String(content || "").trim();
    if (!text.toLowerCase().startsWith("/camera")) return null;

    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
      return { action: "show" };
    }

    const requested = parts.slice(1).join(" ").trim().toLowerCase();
    if (requested === "reset" || requested === "default" || requested === "auto") {
      return { action: "set", camera: "" };
    }

    return { action: "set", camera: normalizeCameraProfile(requested) };
  }

  function parseLightCommand(content) {
    const text = String(content || "").trim();
    if (!text.toLowerCase().startsWith("/light")) return null;

    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
      return { action: "show" };
    }

    const requested = parts.slice(1).join(" ").trim().toLowerCase();
    if (requested === "reset" || requested === "default" || requested === "auto") {
      return { action: "set", lighting: "" };
    }

    return { action: "set", lighting: normalizeLightingProfile(requested) };
  }

  function parseMaterialsCommand(content) {
    const text = String(content || "").trim();
    const lower = text.toLowerCase();

    if (!lower.startsWith("/material") && !lower.startsWith("/materials")) return null;

    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
      return { action: "show" };
    }

    const requested = parts.slice(1).join(" ").trim();
    const requestedLower = requested.toLowerCase();
    if (requestedLower === "reset" || requestedLower === "default" || requestedLower === "auto") {
      return { action: "set", materials: [] };
    }

    return { action: "set", materials: normalizeMaterialList(requested) };
  }

  function parseWebCommand(content) {
    const text = String(content || "").trim();
    const lower = text.toLowerCase();
    if (!lower.startsWith("/web")) return null;

    const query = text.slice(4).trim();
    if (!query) {
      return { action: "help", query: "" };
    }

    return { action: "search", query };
  }

  function parseWeatherCommand(content) {
    const text = String(content || "").trim();
    if (!text.toLowerCase().startsWith("/weather")) return null;
    const location = text.slice(8).trim();
    return {
      action: location ? "lookup" : "help",
      location
    };
  }

  function parseInspectCommand(content) {
    const text = String(content || "").trim();
    if (!text.toLowerCase().startsWith("/inspect")) return null;
    const targetUrl = text.slice(8).trim();
    return {
      action: targetUrl ? "inspect" : "help",
      targetUrl
    };
  }

  function parseLearnCommand(content) {
    const text = String(content || "").trim();
    const lower = text.toLowerCase();
    if (!lower.startsWith("/learn")) return null;

    const query = text.slice(6).trim();
    return {
      action: "status",
      query
    };
  }

  function buildStyleStatusMessage(session) {
    const active = getActiveImageStyle(session);
    const camera = getActiveCameraProfile(session);
    const lighting = getActiveLightingProfile(session);
    const materials = getActiveMaterials(session);
    const styleText = active ? `Current style: **${active}**.` : "Current style: **auto** (no forced style).";
    return `${styleText}\nCamera: **${camera || "auto"}**\nLighting: **${lighting || "auto"}**\nMaterials: **${materials.length ? materials.join(", ") : "auto"}**\n\nUse \`/style <name>\`, \`/camera <profile>\`, \`/light <profile>\`, \`/materials a,b,c\`.\nStyles: ${formatAvailableStyles()}\nCameras: ${formatAvailableCameras()}\nLighting: ${formatAvailableLighting()}\nMaterials: ${formatAvailableMaterials()}`;
  }

  async function requestInternetSearch(query, mode) {
    const params = new URLSearchParams({ q: String(query || "").trim(), mode: String(mode || "auto") });
    const response = await fetch(`/api/internet/search?${params.toString()}`, { method: "GET" });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(String(data?.error || "Internet search failed"));
    }

    return {
      mode: String(data?.mode || "auto"),
      profile: data?.profile || null,
      hits: Array.isArray(data?.hits) ? data.hits : []
    };
  }

  async function requestWeather(location) {
    const params = new URLSearchParams();
    if (String(location || "").trim()) {
      params.set("location", String(location).trim());
    }

    const response = await fetch(`/api/internet/weather?${params.toString()}`, { method: "GET" });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || !data?.ok) {
      throw new Error(String(data?.error || "Weather lookup failed"));
    }

    return data.weather || null;
  }

  async function requestSiteInspection(urlValue) {
    const params = new URLSearchParams({ url: String(urlValue || "").trim() });
    const response = await fetch(`/api/internet/inspect?${params.toString()}`, { method: "GET" });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || !data?.ok) {
      throw new Error(String(data?.error || "Site inspection failed"));
    }

    return data.inspection || null;
  }

  async function requestLearningStatus(mode, query = "") {
    const params = new URLSearchParams();
    if (String(mode || "").trim()) {
      params.set("mode", String(mode).trim());
    }
    if (String(query || "").trim()) {
      params.set("q", String(query).trim());
    }

    const response = await fetch(`/api/internet/learning?${params.toString()}`, { method: "GET" });
    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || !data?.ok) {
      throw new Error(String(data?.error || "Learning memory request failed"));
    }

    return {
      updatedAt: Number(data.updatedAt || 0),
      count: Number(data.count || 0),
      entries: Array.isArray(data.entries) ? data.entries : []
    };
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function toModelLabel(model) {
    const normalized = normalizeModel(model) || "omni";
    if (normalized === "auto") return "Omni";
    return "Omni";
  }

  function toModeLabel(mode) {
    const normalized = normalizeMode(mode) || "auto";
    if (normalized === "system-knowledge") return "System Knowledge";
    if (normalized === "simulation") return "Simulation";
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  function getSimulationDefaults() {
    const defaultRules = String(
      getSetting(
        SETTINGS_KEYS.SIMULATION_DEFAULT_RULES,
        "domain: system-state\ntime: linear\nentities: bounded\ntransitions: deterministic-by-default"
      ) || ""
    ).trim();
    const maxDepth = Number(getSetting(SETTINGS_KEYS.SIMULATION_MAX_DEPTH, "8"));
    const maxSteps = Number(getSetting(SETTINGS_KEYS.SIMULATION_MAX_STEPS, "64"));
    const autoReset = getSettingBool(SETTINGS_KEYS.SIMULATION_AUTO_RESET, false);
    const verbosity = String(getSetting(SETTINGS_KEYS.SIMULATION_LOG_VERBOSITY, "balanced") || "balanced").trim().toLowerCase();

    return {
      rules: defaultRules || "domain: system-state\ntime: linear\nentities: bounded\ntransitions: deterministic-by-default",
      maxDepth: Number.isFinite(maxDepth) ? Math.max(1, Math.min(64, Math.floor(maxDepth))) : 8,
      maxSteps: Number.isFinite(maxSteps) ? Math.max(1, Math.min(500, Math.floor(maxSteps))) : 64,
      autoReset,
      verbosity: ["quiet", "balanced", "verbose"].includes(verbosity) ? verbosity : "balanced"
    };
  }

  function ensureSimulationState(session) {
    if (!session) return null;
    if (!session.simulation || typeof session.simulation !== "object") {
      const defaults = getSimulationDefaults();
      session.simulation = {
        id: `sim_${Date.now()}`,
        status: "inactive",
        steps: 0,
        rules: defaults.rules,
        logs: [{ ts: Date.now(), message: "Simulation profile initialized (system-state)." }],
        maxDepth: defaults.maxDepth,
        maxSteps: defaults.maxSteps,
        autoReset: defaults.autoReset,
        verbosity: defaults.verbosity
      };
    }
    return session.simulation;
  }

  function appendSimulationLog(session, message) {
    const simulation = ensureSimulationState(session);
    if (!simulation) return;
    simulation.logs = Array.isArray(simulation.logs) ? simulation.logs : [];
    simulation.logs.push({ ts: Date.now(), message: String(message || "").trim() || "Simulation event" });
    simulation.logs = simulation.logs.slice(-40);
  }

  function renderSimulationLog(session) {
    if (!simulationLogEl) return;
    const simulation = ensureSimulationState(session);
    const logs = Array.isArray(simulation?.logs) ? simulation.logs : [];
    simulationLogEl.innerHTML = "";

    if (!logs.length) {
      simulationLogEl.innerHTML = "<div class=\"simulation-log-entry\">No simulation logs yet.</div>";
      return;
    }

    for (const entry of logs.slice(-20)) {
      const row = document.createElement("div");
      row.className = "simulation-log-entry";
      const timestamp = Number.isFinite(entry?.ts)
        ? new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : "--:--:--";
      row.textContent = `[${timestamp}] ${String(entry?.message || "")}`;
      simulationLogEl.appendChild(row);
    }
    simulationLogEl.scrollTop = simulationLogEl.scrollHeight;
  }

  function syncSimulationEditor(session) {
    if (!simulationRulesEditorEl) return;
    const simulation = ensureSimulationState(session);
    const nextValue = String(simulation?.rules || "");
    if (simulationRulesEditorEl.value !== nextValue) {
      simulationRulesEditorEl.value = nextValue;
    }
  }

  function updateSimulationUI(session = getActiveSession()) {
    const mode = getActiveMode(session);
    const simulation = ensureSimulationState(session);
    const isSimulationMode = mode === "simulation";
    const isRunning = isSimulationMode && simulation?.status === "active";

    if (simulationPanelEl) {
      simulationPanelEl.hidden = !isSimulationMode;
      simulationPanelEl.open = !!isSimulationMode;
    }

    if (simulationBadgeEl) {
      simulationBadgeEl.hidden = !isSimulationMode;
      const stateLabel = simulation?.status === "active" ? "Running" : simulation?.status === "paused" ? "Paused" : "Inactive";
      const steps = Number.isFinite(simulation?.steps) ? simulation.steps : 0;
      simulationBadgeEl.textContent = `Simulation: ${stateLabel} · Steps ${steps}`;
    }

    if (chatAreaEl) {
      chatAreaEl.classList.toggle("simulation-active", !!isRunning);
    }

    if (simulationStartBtn) simulationStartBtn.disabled = !isSimulationMode || isRunning;
    if (simulationPauseBtn) simulationPauseBtn.disabled = !isSimulationMode || !isRunning;
    if (simulationResetBtn) simulationResetBtn.disabled = !isSimulationMode;
    if (simulationExportBtn) simulationExportBtn.disabled = !isSimulationMode;

    syncSimulationEditor(session);
    renderSimulationLog(session);
  }

  function summarizeHintText(value, maxLen = 180) {
    const compact = String(value || "").replace(/\s+/g, " ").trim();
    if (!compact) return "";
    return compact.length > maxLen ? `${compact.slice(0, maxLen - 3)}...` : compact;
  }

  function getRecentUserMessages(session, limit = 3) {
    const history = Array.isArray(session?.messages) ? session.messages : [];
    return history
      .filter((message) => message?.role === "user")
      .slice(-limit)
      .map((message) => summarizeHintText(message?.content || ""))
      .filter(Boolean);
  }

  function scoreModeSignals(text) {
    const lower = String(text || "").toLowerCase();
    if (!lower) {
      return {
        architect: 0,
        analyst: 0,
        visual: 0,
        lore: 0,
        simulation: 0,
        coding: 0,
        knowledge: 0,
        reasoning: 0,
        "system-knowledge": 0
      };
    }

    const weightedSignals = {
      architect: [
        { pattern: /\b(architecture|system\s+design|schema|database|api\s+contract|pipeline|module|component)\b/g, weight: 2 },
        { pattern: /\b(design|structure|framework|build\s+plan)\b/g, weight: 1 }
      ],
      analyst: [
        { pattern: /\b(analyze|analysis|evaluate|compare|breakdown|root\s+cause|trade-?off)\b/g, weight: 2 },
        { pattern: /\b(trend|pattern|report|insight|metrics?)\b/g, weight: 1 }
      ],
      visual: [
        { pattern: /\b(image|visual|illustration|render|draw|paint|cinematic|composition|aesthetic)\b/g, weight: 2 },
        { pattern: /\b(scene|style|color\s+palette|lighting)\b/g, weight: 1 }
      ],
      lore: [
        { pattern: /\b(story|lore|narrative|worldbuild|character\s+arc|mythology|legend)\b/g, weight: 2 },
        { pattern: /\b(tale|fiction|backstory|history)\b/g, weight: 1 }
      ],
      simulation: [
        { pattern: /\b(simulate|simulation|state\s+transition|run\s+scenario|sandbox|what\s+if)\b/g, weight: 2 },
        { pattern: /\b(rules:|system-state|agent-based|scenario)\b/g, weight: 1 }
      ],
      coding: [
        { pattern: /\b(code|coding|refactor|typescript|javascript|python|bug|stack\s+trace|compile|lint|test)\b/g, weight: 2 },
        { pattern: /\b(function|class|api\s+route|implementation|patch)\b/g, weight: 1 }
      ],
      knowledge: [
        { pattern: /\b(explain|what\s+is|teach|overview|reference|facts?|background)\b/g, weight: 1 },
        { pattern: /\b(source|citation|docs?|documentation)\b/g, weight: 1 }
      ],
      reasoning: [
        { pattern: /\b(reason|reasoning|logic|prove|deduce|step\s*-?by\s*-?step|chain\s+of\s+thought)\b/g, weight: 2 },
        { pattern: /\bwhy|because|inference\b/g, weight: 1 }
      ],
      "system-knowledge": [
        { pattern: /\b(system\s+knowledge|internal\s+module|runtime\s+internals|worker\s+topology|orchestrator)\b/g, weight: 2 },
        { pattern: /\barchitecture\s+doc|codex|governance|module\s+map\b/g, weight: 1 }
      ]
    };

    const scores = {};
    for (const [mode, signals] of Object.entries(weightedSignals)) {
      let score = 0;
      for (const signal of signals) {
        const matches = lower.match(signal.pattern);
        if (matches?.length) {
          score += matches.length * signal.weight;
        }
      }
      scores[mode] = score;
    }

    return scores;
  }

  function detectModeFromContent(content, session = null) {
    if (!content) return null;
    const latest = String(content || "").trim();
    const recent = getRecentUserMessages(session, 2).join(" ");
    const aggregate = `${latest} ${recent}`.trim();
    if (!aggregate) return null;

    const scores = scoreModeSignals(aggregate);
    const ranked = Object.entries(scores)
      .sort((a, b) => b[1] - a[1]);

    const [topMode, topScore] = ranked[0] || [];
    const secondScore = ranked[1]?.[1] || 0;
    if (!topMode || !Number.isFinite(topScore)) return null;

    const margin = topScore - secondScore;
    if (topScore < 2 || margin < 1) {
      return null;
    }

    const confidence = Math.max(0.35, Math.min(0.98, topScore / (topScore + secondScore + 1)));
    return {
      mode: topMode,
      confidence
    };
  }

  function inferRequestedOutputStyle(text) {
    const lower = String(text || "").toLowerCase();
    if (!lower) return "general";
    if (/\b(table|csv|json|yaml|xml)\b/.test(lower)) return "structured-data";
    if (/\b(step\s*-?by\s*-?step|plan|checklist|roadmap)\b/.test(lower)) return "procedural";
    if (/\b(brief|short|tldr|concise)\b/.test(lower)) return "concise";
    if (/\b(detailed|deep\s*dive|comprehensive|long\s*form)\b/.test(lower)) return "detailed";
    if (/\b(code|typescript|javascript|python|sql|bash|powershell)\b/.test(lower)) return "code";
    return "general";
  }

  function buildConversationHints(session, effectiveMode, latestInput) {
    const recentUserFocus = getRecentUserMessages(session, 3);
    const recentAssistantCommitments = (Array.isArray(session?.messages) ? session.messages : [])
      .filter((message) => message?.role === "assistant")
      .slice(-2)
      .map((message) => summarizeHintText(message?.content || ""))
      .filter(Boolean);

    return {
      inferredMode: normalizeMode(effectiveMode) || "auto",
      latestUserIntent: summarizeHintText(latestInput || ""),
      recentUserFocus,
      recentAssistantCommitments,
      requestedOutput: inferRequestedOutputStyle(latestInput)
    };
  }

  function getSelectedModeFromSettings() {
    try {
      const fallbackMode = normalizeMode(localStorage.getItem(SETTINGS_KEYS.DEFAULT_MODE)) || "auto";
      const selectionMode = (localStorage.getItem(SETTINGS_KEYS.MODE_SELECTION) || "automatic").trim().toLowerCase();
      if (selectionMode === "manual") {
        return fallbackMode;
      }
      return fallbackMode;
    } catch {
      return "auto";
    }
  }

  function getActiveMode(session = getActiveSession()) {
    const sessionMode = normalizeMode(session?.mode);
    if (sessionMode === "auto") return "auto";
    if (sessionMode) return sessionMode;
    return "auto";
  }

  function updateModeIndicator(mode) {
    if (!modeLabelEl) return;
    modeLabelEl.textContent = `Mode: ${toModeLabel(mode)}`;
  }

  function updateModelInspector(modelUsed, routeReason = "") {
    if (!modelInspectorEl) return;
    const modelText = modelUsed ? toModelLabel(modelUsed) : "Pending";
    const reasonText = routeReason ? ` (${routeReason})` : "";
    modelInspectorEl.textContent = `Model: ${modelText}${reasonText}`;
  }

  function updateModeButton(mode) {
    if (!modeBtn) return;
    const label = toModeLabel(mode);
    modeBtn.textContent = label;
    modeBtn.setAttribute("aria-label", `Change chat mode. Current mode: ${label}`);
  }

  function updateModelButton(model) {
    if (!modelBtn) return;
    const label = toModelLabel(model);
    modelBtn.textContent = label;
    modelBtn.setAttribute("aria-label", `Change model. Current model: ${label}`);
  }

  function getDropdownItems(menuEl) {
    if (!menuEl) return [];
    return Array.from(menuEl.querySelectorAll(".chat-dropdown-item[data-value]"));
  }

  function setActiveDropdownItem(menuEl, value) {
    const normalized = (value || "").trim().toLowerCase();
    for (const item of getDropdownItems(menuEl)) {
      const isActive = (item.dataset.value || "").toLowerCase() === normalized;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-selected", isActive ? "true" : "false");
    }
  }

  function setDropdownOpen(dropdownEl, buttonEl, open) {
    if (!dropdownEl || !buttonEl) return;
    const menuEl = dropdownEl.querySelector(".chat-dropdown");
    dropdownEl.classList.toggle("open", !!open);
    if (menuEl) {
      menuEl.classList.toggle("open", !!open);
      menuEl.hidden = !open;
      menuEl.style.display = open ? "grid" : "none";
      menuEl.style.pointerEvents = open ? "auto" : "none";
    }
    buttonEl.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function closeAllDropdowns() {
    setDropdownOpen(modelDropdown, modelBtn, false);
    setDropdownOpen(modeDropdown, modeBtn, false);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        createNewSession();
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.sessions || !parsed.activeSessionId) {
        createNewSession();
        return;
      }
      state = parsed;

      for (const session of Object.values(state.sessions)) {
        if (!session || typeof session !== "object") continue;
        session.mode = getActiveMode(session);
        ensureSimulationState(session);
      }

      if (!state.sessions[state.activeSessionId]) {
        const firstSessionId = Object.keys(state.sessions)[0];
        if (firstSessionId) {
          state.activeSessionId = firstSessionId;
        } else {
          createNewSession();
          return;
        }
      }

      saveState();
    } catch {
      createNewSession();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }

  function createNewSession() {
    const id = `session_${Date.now()}`;
    state.sessions[id] = {
      id,
      title: "New conversation",
      messages: [],
      mode: getSelectedModeFromSettings(),
      model: "omni",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    ensureSimulationState(state.sessions[id]);
    state.activeSessionId = id;
    saveState();
  }

  function getActiveSession() {
    return state.sessions[state.activeSessionId] || null;
  }

  function setActiveSession(id) {
    if (!state.sessions[id]) return;
    state.activeSessionId = id;
    saveState();
    renderSessionsSidebar();
    syncSelectorsFromSession();
    renderActiveSessionMessages();
  }

  function updateSessionMetaFromMessages(session) {
    if (!session || typeof session !== "object") return;

    const messages = Array.isArray(session.messages) ? session.messages : [];
    const firstUserMessage = messages.find((msg) => msg && msg.role === "user" && String(msg.content || "").trim());

    if (firstUserMessage) {
      const title = String(firstUserMessage.content || "").trim().replace(/\s+/g, " ").slice(0, 64);
      session.title = title || "New conversation";
    } else {
      session.title = session.title || "New conversation";
    }

    session.updatedAt = Date.now();
  }

  function deleteSession(id) {
    if (!id || !state.sessions[id]) return;

    const wasActive = state.activeSessionId === id;
    delete state.sessions[id];

    const remainingIds = Object.keys(state.sessions).sort((a, b) => {
      return (state.sessions[b]?.updatedAt || 0) - (state.sessions[a]?.updatedAt || 0);
    });

    if (!remainingIds.length) {
      createNewSession();
    } else if (wasActive) {
      state.activeSessionId = remainingIds[0];
    }

    saveState();
    syncSelectorsFromSession();
    renderSessionsSidebar();
    renderActiveSessionMessages();
  }

  function resetToFreshChat() {
    state = {
      activeSessionId: null,
      sessions: {}
    };
    createNewSession();
    syncSelectorsFromSession();
    renderSessionsSidebar();
    renderActiveSessionMessages();
  }

  function formatAvailableStyles() {
    return KNOWN_RENDER_STYLES.join(", ");
  }

  function formatAvailableCameras() {
    return KNOWN_CAMERA_PROFILES.join(", ");
  }

  function formatAvailableLighting() {
    return KNOWN_LIGHTING_PROFILES.join(", ");
  }

  function formatAvailableMaterials() {
    return KNOWN_MATERIAL_PROFILES.join(", ");
  }

  function createGeneratedMediaCard(meta = {}) {
    return createGeneratedImageCard(meta);
  }

  function syncSelectorsFromSession() {
    const session = getActiveSession();
    if (!session) return;

    const activeMode = getActiveMode(session);
    session.mode = activeMode;
    session.model = "omni";

    updateModelButton(session.model);
    updateModeButton(activeMode);
    setActiveDropdownItem(modelMenu, session.model);
    setActiveDropdownItem(modeMenu, activeMode);
    updateModeIndicator(activeMode);
    updateSimulationUI(session);
  }

  function clearMessages() {
    if (!messagesEl) return;
    messagesEl.innerHTML = "";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderInlineMarkdown(value) {
    let output = escapeHtml(value || "");
    output = output.replace(/`([^`]+)`/g, "<code>$1</code>");
    output = output.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    output = output.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    output = output.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    output = output.replace(/\n/g, "<br>");
    return output;
  }

  function renderMarkdown(value) {
    const source = String(value || "");
    if (!source.trim()) return "";

    const segments = source.split(/```/);
    const htmlParts = [];

    for (let i = 0; i < segments.length; i += 1) {
      const part = segments[i];
      if (i % 2 === 1) {
        const lines = part.split("\n");
        const firstLine = String(lines[0] || "").trim();
        const language = /^[-_a-z0-9+#]+$/i.test(firstLine) ? firstLine.toLowerCase() : "";
        const codeContent = language ? lines.slice(1).join("\n") : part;
        const langClass = language ? ` class="language-${language}"` : "";
        htmlParts.push(`<pre><code${langClass}>${escapeHtml(codeContent)}</code></pre>`);
      } else {
        const blocks = part
          .split(/\n{2,}/)
          .map((block) => block.trim())
          .filter(Boolean);

        for (const block of blocks) {
          htmlParts.push(`<p>${renderInlineMarkdown(block)}</p>`);
        }
      }
    }

    return htmlParts.join("\n");
  }

  function toFilenameSlug(value, fallback = "asset") {
    const slug = String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 56);
    return slug || fallback;
  }

  function buildOmniExportFilename(kind, ext, timestamp, prompt) {
    const ts = Number(timestamp);
    const date = Number.isFinite(ts) ? new Date(ts) : new Date();
    const iso = date.toISOString().replace(/[:.]/g, "-");
    const safeKind = toFilenameSlug(kind, "asset");
    const safePrompt = toFilenameSlug(prompt, safeKind);
    const safeExt = String(ext || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    return `${safeKind}-${safePrompt}-${iso}.${safeExt}`;
  }

  const IMAGE_EXPORT_WIDTH = 2160;
  const IMAGE_EXPORT_HEIGHT = 3840;
  const IMAGE_EXPORT_RATIO = "9:16";
  const IMAGE_EXPORT_RESOLUTION = "4k";
  const IMAGE_EXPORT_RESOLUTION_LABEL = `${IMAGE_EXPORT_WIDTH}x${IMAGE_EXPORT_HEIGHT}`;

  function formatGeneratedTimestamp(value) {
    const ts = Number(value);
    if (!Number.isFinite(ts) || ts <= 0) return "";
    return new Date(ts).toLocaleString();
  }

  function createGeneratedImageCard(meta = {}) {
    const imageDataUrl = String(meta.imageDataUrl || "").trim();
    if (!imageDataUrl.startsWith("data:image/")) {
      return null;
    }

    const generatedAt = Number(meta.generatedAt || Date.now());
    const prompt = String(meta.imagePrompt || "Generated image").trim() || "Generated image";
    const filename = buildOmniExportFilename("image", "png", generatedAt, prompt);
    const resolution = String(meta.imageResolution || "").trim() || IMAGE_EXPORT_RESOLUTION_LABEL;
    const styleId = String(meta.imageStyleId || "").trim();
    const createdLabel = formatGeneratedTimestamp(generatedAt);

    const card = document.createElement("div");
    card.className = "generated-image-card";

    const img = document.createElement("img");
    img.className = "generated-image-preview";
    img.src = imageDataUrl;
    img.alt = prompt;
    img.loading = "lazy";

    const actions = document.createElement("div");
    actions.className = "generated-image-actions";

    const download = document.createElement("a");
    download.className = "generated-image-download";
    download.href = imageDataUrl;
    download.download = filename;
    download.textContent = "Download image";
    download.setAttribute("aria-label", `Download generated image ${filename}`);

    actions.appendChild(download);

    if (resolution || styleId || createdLabel) {
      const info = document.createElement("div");
      info.className = "generated-image-meta";
      info.textContent = [resolution, styleId, createdLabel ? `Created: ${createdLabel}` : ""].filter(Boolean).join(" • ");
      actions.appendChild(info);
    }

    card.appendChild(img);
    card.appendChild(actions);

    return card;
  }


  function createMessageElement(role, content, meta = {}) {
    const wrapper = document.createElement("div");
    wrapper.className = `message ${role === "user" ? "user" : "bot"} message-${role}`;

    const inner = document.createElement("div");
    inner.className = "message-inner";

    const header = document.createElement("div");
    header.className = "message-header";

    const roleLabel = document.createElement("span");
    roleLabel.className = "message-role";
    roleLabel.textContent = role === "user" ? "You" : "Omni";

    header.appendChild(roleLabel);

    if (runtimeSettings.showTimestamps && meta.timestamp) {
      const timestampEl = document.createElement("span");
      timestampEl.className = "message-timestamp";
      timestampEl.textContent = formatMessageTimestamp(meta.timestamp);
      header.appendChild(timestampEl);
    }

    if (runtimeSettings.showAssistantBadges && role === "assistant" && (meta.model || meta.mode)) {
      const badge = document.createElement("span");
      badge.className = "message-badge";
      
      // Format model name (capitalize first letter)
      const modelName = meta.model ? 
        meta.model.charAt(0).toUpperCase() + meta.model.slice(1) : null;
      
      // Format mode name using toModeLabel for consistent capitalization
      const modeName = meta.mode ? toModeLabel(meta.mode) : null;
      
      badge.textContent = [modelName, modeName].filter(Boolean).join(" • ");
      header.appendChild(badge);
    }

    const body = document.createElement("div");
    body.className = "message-body";
    body.innerHTML = renderMarkdown(content || "");

    const imageCard = createGeneratedImageCard(meta);
    if (imageCard) {
      if ((content || "").trim()) {
        const spacer = document.createElement("div");
        spacer.className = "generated-image-spacer";
        body.appendChild(spacer);
      }
      body.appendChild(imageCard);
    }

    inner.appendChild(header);
    inner.appendChild(body);
    wrapper.appendChild(inner);

    return { wrapper, body };
  }

  function appendMessage(role, content, meta = {}) {
    if (!messagesEl) return null;
    const { wrapper, body } = createMessageElement(role, content, meta);
    messagesEl.appendChild(wrapper);
    smoothScrollToBottom(false);
    return { wrapper, body };
  }

  function updateAssistantMessageBody(bodyEl, text, options = {}) {
    if (!bodyEl) return;
    bodyEl.innerHTML = renderMarkdown(text);
    if (options.highlight !== false) {
      highlightCodeBlocks(bodyEl);
    }
    smoothScrollToBottom(false);
  }

  function highlightCodeBlocks(containerEl) {
    if (!containerEl || !window.hljs) return;
    const blocks = containerEl.querySelectorAll("pre code");
    for (const block of blocks) {
      window.hljs.highlightElement(block);
    }
  }

  function renderActiveSessionMessages() {
    clearMessages();
    const session = getActiveSession();
    if (!session) return;

    for (const msg of session.messages) {
      const activeMode = getActiveMode(session);
      appendMessage(msg.role, msg.content, {
        model: session.model || "omni",
        mode: activeMode,
        timestamp: msg.timestamp || msg.ts || null,
        generatedAt: msg.generatedAt || msg.timestamp || msg.ts || null,
        imageDataUrl: msg.imageDataUrl || "",
        imageFilename: msg.imageFilename || "",
        imagePrompt: msg.imagePrompt || "",
        imageResolution: msg.imageResolution || "",
        imageStyleId: msg.imageStyleId || ""
      });
    }
  }

  // =========================
  // 5. TOKEN ENGINE
  // =========================
  function appendTokenWithSpacing(currentText, token) {
    const t = typeof token === "string" ? token : String(token ?? "");
    if (!t) return currentText;
    return (currentText || "") + t;
  }

  // =========================
  // 6. STREAMING + NETWORK ENGINE
  // =========================
  let isStreaming = false;
  let currentAbortController = null;
  let apiHealthy = true;
  let apiCheckTimer = null;

  function getApiEndpoint() {
    try {
      const saved = localStorage.getItem("omni-endpoint") || "";
      return saved.trim() || "/api/omni";
    } catch {
      return "/api/omni";
    }
  }

  function getImageEndpoint() {
    const chatEndpoint = getApiEndpoint();
    try {
      const url = new URL(chatEndpoint, window.location.origin);
      if (/\/api\/omni$/i.test(url.pathname)) {
        url.pathname = url.pathname.replace(/\/api\/omni$/i, "/api/image");
      } else {
        url.pathname = "/api/image";
      }
      url.search = "";

      if (url.origin === window.location.origin) {
        return url.pathname;
      }

      return url.toString();
    } catch {
      return "/api/image";
    }
  }

  function isImageGenerationRequest(text) {
    const value = String(text || "").trim().toLowerCase();
    if (!value) return false;
    if (value.startsWith("/image ") || value === "/image") return true;

    const directIntent = /\b(generate|create|make|render|draw|imagine|design)\b[\s\S]{0,80}\b(image|picture|illustration|art|photo|logo|poster|wallpaper)\b/i;
    const quickIntent = /\b(image of|picture of|illustration of|art of)\b/i;
    return directIntent.test(value) || quickIntent.test(value);
  }

  function extractImagePrompt(text) {
    const raw = String(text || "").trim();
    if (!raw) return "";

    if (raw.toLowerCase().startsWith("/image")) {
      return raw.slice(6).trim();
    }

    return raw
      .replace(/^\s*(please\s+)?(generate|create|make|render|draw|imagine|design)\s+(an?\s+)?(image|picture|illustration|art|photo|logo|poster|wallpaper)\s*(of|for)?\s*/i, "")
      .trim() || raw;
  }

  function extractBackendErrorReason(data, rawText, fallbackMessage) {
    const fallback = String(fallbackMessage || "Backend returned an error").trim() || "Backend returned an error";

    if (typeof data?.error === "string" && data.error.trim()) {
      return data.error.trim();
    }

    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message.trim();
    }

    if (typeof data?.detail === "string" && data.detail.trim()) {
      return data.detail.trim();
    }

    if (Array.isArray(data?.detail)) {
      const detailMessages = data.detail
        .map((item) => {
          if (typeof item === "string") return item.trim();
          if (item && typeof item === "object" && typeof item.msg === "string") return item.msg.trim();
          return "";
        })
        .filter(Boolean);

      if (detailMessages.length) {
        return detailMessages.join("; ");
      }
    }

    if (data?.detail && typeof data.detail === "object") {
      const nestedReason = String(data.detail.message || data.detail.error || data.detail.reason || "").trim();
      if (nestedReason) {
        return nestedReason;
      }
    }

    const text = String(rawText || "").trim();
    if (!text) {
      return fallback;
    }

    if (text.startsWith("<")) {
      return fallback;
    }

    return text.length > 400 ? `${text.slice(0, 397)}...` : text;
  }

  async function requestGeneratedImage(session, prompt, safetyProfile = null) {
    const preflight = preflightMediaGenerationCheck(prompt, "image");
    if (!preflight.ok) {
      throw new Error(preflight.message);
    }

    const selectedStyle = getActiveImageStyle(session);
    const selectedCamera = getActiveCameraProfile(session);
    const selectedLighting = getActiveLightingProfile(session);
    const selectedMaterials = getActiveMaterials(session);
    const payload = {
      userId: session?.id || `session-${Date.now()}`,
      prompt,
      feedback: "",
      stylePack: selectedStyle || "",
      quality: "ultra",
      ratio: IMAGE_EXPORT_RATIO,
      resolution: IMAGE_EXPORT_RESOLUTION,
      width: IMAGE_EXPORT_WIDTH,
      height: IMAGE_EXPORT_HEIGHT,
      safetyProfile: safetyProfile || buildSafetyProfile()
    };

    if (selectedCamera) {
      payload.camera = selectedCamera;
    }
    if (selectedLighting) {
      payload.lighting = selectedLighting;
    }
    if (selectedMaterials.length) {
      payload.materials = selectedMaterials;
    }

    const res = await fetch(getImageEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const reason = data?.error || "Image backend returned an error";
      const code = String(data?.code || "").trim();
      const withCode = code ? `${reason} (${code})` : reason;
      const details = String(data?.details || "").trim();
      const finalMessage = details && runtimeSettings?.showAssistantBadges ? `${withCode}: ${details}` : withCode;
      throw new Error(finalMessage);
    }

    const imageDataUrl = String(data?.imageDataUrl || "").trim();
    if (!imageDataUrl.startsWith("data:image/")) {
      throw new Error("Image response did not include a valid image payload");
    }

    return {
      imageDataUrl,
      filename: String(data?.filename || "generated-image.png").trim() || "generated-image.png",
      metadata: data?.metadata || {},
      modelUsed: String(res.headers.get("X-Omni-Image-Model") || data?.metadata?.model || "").trim()
    };
  }

  function setApiStatus(state) {
    if (!apiStatusEl) return;

    if (state === "online") {
      apiStatusEl.textContent = "API: online";
    } else if (state === "offline") {
      apiStatusEl.textContent = "API: offline";
    } else {
      apiStatusEl.textContent = "API: checking…";
    }
  }

  async function checkApiStatus() {
    setApiStatus("checking");

    try {
      const res = await fetch(getApiEndpoint(), {
        method: "OPTIONS"
      });
      apiHealthy = res.ok || res.status === 204;
    } catch {
      apiHealthy = false;
    }

    setApiStatus(apiHealthy ? "online" : "offline");
    return apiHealthy;
  }

  function startApiChecks() {
    if (apiCheckTimer) {
      clearInterval(apiCheckTimer);
    }

    checkApiStatus();
    apiCheckTimer = setInterval(() => {
      checkApiStatus();
    }, Math.max(10, runtimeSettings.apiHealthIntervalSeconds) * 1000);
  }

  function isRetryableStatus(status) {
    return status === 408 || status === 425 || status === 429 || (status >= 500 && status <= 599);
  }

  function isLikelyMobileViewport() {
    try {
      if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true;
      return Math.min(window.innerWidth || 9999, window.innerHeight || 9999) <= 900;
    } catch {
      return false;
    }
  }

  function focusInputIfAppropriate() {
    if (!inputEl) return;
    if (isLikelyMobileViewport()) return;
    inputEl.focus();
  }

  function updateMobileViewportMetrics() {
    const root = document.documentElement;
    if (!root) return;

    const viewportHeight = Number(window.visualViewport?.height || window.innerHeight || 0);
    if (viewportHeight > 0) {
      root.style.setProperty("--omni-vvh", `${viewportHeight}px`);
    }

    const baselineHeight = Number(window.innerHeight || viewportHeight || 0);
    const keyboardOpen = baselineHeight > 0 && viewportHeight > 0 && baselineHeight - viewportHeight > 120;
    document.body.classList.toggle("mobile-keyboard-open", Boolean(keyboardOpen));
    applyRuntimeSettings();
  }

  function installMobileViewportHandlers() {
    updateMobileViewportMetrics();

    const focusSelector = "input, textarea, [contenteditable='true']";
    document.addEventListener("focusin", (event) => {
      if (event.target && event.target.matches && event.target.matches(focusSelector)) {
        document.body.classList.add("mobile-input-active");
        updateMobileViewportMetrics();
      }
    });

    document.addEventListener("focusout", (event) => {
      if (event.target && event.target.matches && event.target.matches(focusSelector)) {
        setTimeout(() => {
          const active = document.activeElement;
          const stillEditing = active && active.matches && active.matches(focusSelector);
          if (!stillEditing) {
            document.body.classList.remove("mobile-input-active");
          }
          updateMobileViewportMetrics();
        }, 80);
      }
    });

    window.addEventListener("resize", updateMobileViewportMetrics);
    window.addEventListener("orientationchange", updateMobileViewportMetrics);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", updateMobileViewportMetrics);
      window.visualViewport.addEventListener("scroll", updateMobileViewportMetrics);
    }
  }

  function buildNetworkMessages(session, maxMessages = 24, maxChars = 22000) {
    const history = Array.isArray(session?.messages) ? session.messages : [];
    if (!history.length) return [];

    const compact = [];
    let totalChars = 0;

    for (let index = history.length - 1; index >= 0; index -= 1) {
      const item = history[index] || {};
      const role = String(item.role || "").toLowerCase() === "assistant" ? "assistant" : "user";
      const content = String(item.content || "").trim();
      if (!content) continue;

      const wouldExceedChars = totalChars + content.length > maxChars;
      if (wouldExceedChars && compact.length >= 6) {
        break;
      }

      compact.push({ role, content });
      totalChars += content.length;

      if (compact.length >= maxMessages) {
        break;
      }
    }

    return compact.reverse();
  }

  async function streamOmniResponse(session, onChunk, onMeta, safetyProfile = null, modeOverride = "", conversationHints = null) {
    const activeMode = normalizeMode(modeOverride) || getActiveMode(session);
    const outboundMessages = buildNetworkMessages(session);
    const payload = {
      messages: outboundMessages,
      model: "omni",
      mode: activeMode,
      safetyProfile: safetyProfile || buildSafetyProfile(),
      conversationHints: conversationHints && typeof conversationHints === "object" ? conversationHints : undefined
    };

    const requestHeaders = { "Content-Type": "application/json" };
    if (session?.id) {
      requestHeaders["x-omni-session-id"] = String(session.id);
    }

    const controller = new AbortController();
    currentAbortController = controller;
    const timeoutMs = Math.max(10, runtimeSettings.requestTimeoutSeconds) * 1000;
    const timeoutHandle = setTimeout(() => {
      try {
        controller.abort("request-timeout");
      } catch {
        // ignore
      }
    }, timeoutMs);

    const maxAttempts = 1 + Math.max(0, runtimeSettings.apiRetries);
    let res;
    let lastError = null;
    let attempt = 0;

    try {
      while (attempt < maxAttempts) {
        attempt += 1;
        try {
          res = await fetch(getApiEndpoint(), {
            method: "POST",
            headers: requestHeaders,
            body: JSON.stringify(payload),
            signal: controller.signal
          });

          if (res.ok && res.body) {
            break;
          }

          if (!isRetryableStatus(res.status) || attempt >= maxAttempts) {
            break;
          }
        } catch (error) {
          lastError = error;
          if (attempt >= maxAttempts) {
            throw error;
          }
        }
      }
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (!res || !res.ok || !res.body) {
      if (lastError) {
        throw lastError;
      }
      throw new Error("Bad response from Omni backend");
    }

    if (typeof onMeta === "function") {
      onMeta({
        modelUsed: (res.headers.get("X-Omni-Model-Used") || "").trim(),
        routeReason: (res.headers.get("X-Omni-Route-Reason") || "").trim(),
        orchestratorRoute: (res.headers.get("X-Omni-Orchestrator-Route") || "").trim(),
        orchestratorReason: (res.headers.get("X-Omni-Orchestrator-Reason") || "").trim(),
        personaTone: (res.headers.get("X-Omni-Persona-Tone") || "").trim(),
        userEmotion: (res.headers.get("X-Omni-Emotion-User") || "").trim(),
        omniEmotion: (res.headers.get("X-Omni-Emotion-Omni") || "").trim(),
        internetMode: (res.headers.get("X-Omni-Internet-Mode") || "").trim(),
        internetProfile: (res.headers.get("X-Omni-Internet-Profile") || "").trim(),
        internetCount: Number(res.headers.get("X-Omni-Internet-Count") || "0"),
        simulationId: (res.headers.get("X-Omni-Simulation-Id") || "").trim(),
        simulationStatus: (res.headers.get("X-Omni-Simulation-Status") || "").trim(),
        simulationSteps: Number(res.headers.get("X-Omni-Simulation-Steps") || "0")
      });
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    const processSseLine = (line) => {
      const normalized = line.replace(/\r$/, "");
      if (!normalized.startsWith("data:")) return false;

      let data = normalized.slice(5);

      if (data.startsWith(" ")) {
        data = data.slice(1);
      }

      if (data.trim() === "[DONE]") {
        return true;
      }

      if (data.length === 0) return false;

      let token = data;
      try {
        const parsed = JSON.parse(data);
        if (typeof parsed === "string") {
          token = parsed;
        } else if (parsed && typeof parsed.token === "string") {
          token = parsed.token;
        } else if (parsed && typeof parsed === "object") {
          token = parsed;
        }
      } catch {
        // raw token
      }

      onChunk(token);
      return false;
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        if (buffer) {
          const trailingLines = buffer.split("\n");
          for (const trailingLine of trailingLines) {
            if (processSseLine(trailingLine)) {
              return;
            }
          }
        }
        break;
      }
      if (!value) continue;

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (processSseLine(line)) {
          buffer = "";
          return;
        }
      }
    }
  }

  async function sendMessage(content) {
    if (isStreaming) return;
    const session = getActiveSession();
    if (!session) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    if (!hasVerifiedLegalAttestation()) {
      appendMessage("assistant", "Legal attestation is required before chat can run. Please confirm jurisdiction eligibility and truthful/responsible use.", {
        model: session.model || "omni",
        mode: getActiveMode(session),
        timestamp: Date.now()
      });
      openLegalAttestationModal();
      return;
    }

    const styleCommand = parseStyleCommand(trimmed);
    const cameraCommand = parseCameraCommand(trimmed);
    const lightCommand = parseLightCommand(trimmed);
    const materialsCommand = parseMaterialsCommand(trimmed);
    const webCommand = parseWebCommand(trimmed);
    const weatherCommand = parseWeatherCommand(trimmed);
    const inspectCommand = parseInspectCommand(trimmed);
    const learnCommand = parseLearnCommand(trimmed);
    if (styleCommand || cameraCommand || lightCommand || materialsCommand || webCommand || weatherCommand || inspectCommand || learnCommand) {
      const commandTimestamp = Date.now();
      session.messages.push({ role: "user", content: trimmed, timestamp: commandTimestamp });
      updateSessionMetaFromMessages(session);
      saveState();

      const activeMode = getActiveMode(session);
      appendMessage("user", trimmed, {
        model: session.model || "omni",
        mode: activeMode,
        timestamp: commandTimestamp
      });

      let assistantText = "";
      let assistantMediaMeta = null;
      let liveCommandAssistantBody = null;
      if (styleCommand) {
        if (styleCommand.action === "show") {
          assistantText = buildStyleStatusMessage(session);
        } else {
          const requestedStyle = String(styleCommand.style || "").trim();
          if (!requestedStyle && String(trimmed || "").trim().split(/\s+/).length > 1 && !/\b(auto|none|off|reset)\b/i.test(trimmed)) {
            assistantText = `Unknown style. Use one of: ${formatAvailableStyles()}`;
          } else {
            session.imageStyle = requestedStyle;
            if (requestedStyle === "hyper-real") {
              session.imageCamera = getActiveCameraProfile(session);
              session.imageLighting = getActiveLightingProfile(session);
            }
            session.updatedAt = Date.now();
            saveState();
            assistantText = requestedStyle
              ? `Image style set to **${requestedStyle}** for this session.`
              : "Image style reset to **auto** for this session.";
          }
        }
      } else if (cameraCommand) {
        if (cameraCommand.action === "show") {
          assistantText = `Current camera: **${getActiveCameraProfile(session)}**. Available: ${formatAvailableCameras()}`;
        } else {
          const requestedCamera = String(cameraCommand.camera || "").trim();
          if (!requestedCamera) {
            assistantText = `Unknown camera profile. Use one of: ${formatAvailableCameras()}`;
          } else {
            session.imageCamera = requestedCamera;
            session.updatedAt = Date.now();
            saveState();
            assistantText = `Camera profile set to **${requestedCamera}**.`;
          }
        }
      } else if (lightCommand) {
        if (lightCommand.action === "show") {
          assistantText = `Current lighting: **${getActiveLightingProfile(session)}**. Available: ${formatAvailableLighting()}`;
        } else {
          const requestedLighting = String(lightCommand.lighting || "").trim();
          if (!requestedLighting) {
            assistantText = `Unknown lighting profile. Use one of: ${formatAvailableLighting()}`;
          } else {
            session.imageLighting = requestedLighting;
            session.updatedAt = Date.now();
            saveState();
            assistantText = `Lighting profile set to **${requestedLighting}**.`;
          }
        }
      } else if (materialsCommand) {
        if (materialsCommand.action === "show") {
          assistantText = `Current materials: **${getActiveMaterials(session).join(", ")}**. Available: ${formatAvailableMaterials()}`;
        } else {
          const requestedMaterials = Array.isArray(materialsCommand.materials) ? materialsCommand.materials : [];
          if (!requestedMaterials.length) {
            assistantText = `Unknown material profile. Use one or more of: ${formatAvailableMaterials()}`;
          } else {
            session.imageMaterials = requestedMaterials;
            session.updatedAt = Date.now();
            saveState();
            assistantText = `Materials set to **${requestedMaterials.join(", ")}**.`;
          }
        }
      } else if (webCommand) {
        if (webCommand.action === "help") {
          assistantText = "Usage: `/web <query>` to search the internet with your current mode profile. Also available: `/weather <location>` and `/inspect <url>`.";
        } else {
          try {
            const currentMode = getActiveMode(session);
            const search = await requestInternetSearch(webCommand.query, currentMode);
            if (!search.hits.length) {
              assistantText = `No internet results found for **${webCommand.query}** in mode **${search.mode}**.`;
            } else {
              const preview = search.hits
                .slice(0, 4)
                .map((hit, index) => `${index + 1}. **${hit.title}**\n${hit.snippet || "No summary available."}\n${hit.url}`)
                .join("\n\n");
              assistantText = [
                `Internet search results for **${webCommand.query}** (mode: **${search.mode}**):`,
                preview
              ].join("\n\n");
            }
          } catch (error) {
            assistantText = `Internet search failed: ${error instanceof Error ? error.message : "unknown error"}`;
          }
        }
      } else if (weatherCommand) {
        if (weatherCommand.action === "help") {
          assistantText = "Usage: `/weather <location>` for live weather snapshots. Example: `/weather Tokyo`.";
        } else {
          try {
            const weather = await requestWeather(weatherCommand.location);
            if (!weather) {
              assistantText = `No weather data found for **${weatherCommand.location}**.`;
            } else {
              assistantText = [
                `Live weather for **${weather.location}**:`,
                `- Temperature: **${weather.temperatureC}°C**`,
                `- Wind: **${weather.windSpeedKmh} km/h**`,
                `- Weather code: **${weather.weatherCode}**`,
                `- Time: **${weather.observationTime}** (${weather.timezone || "local"})`
              ].join("\n");
            }
          } catch (error) {
            assistantText = `Weather lookup failed: ${error instanceof Error ? error.message : "unknown error"}`;
          }
        }
      } else if (inspectCommand) {
        if (inspectCommand.action === "help") {
          assistantText = "Usage: `/inspect <url>` to retrieve title, excerpt, and page content preview.";
        } else {
          try {
            const inspection = await requestSiteInspection(inspectCommand.targetUrl);
            if (!inspection) {
              assistantText = `Site inspection failed for **${inspectCommand.targetUrl}**.`;
            } else {
              assistantText = [
                `Inspection for **${inspection.url}**`,
                `Title: **${inspection.title || "Untitled"}**`,
                `Excerpt: ${inspection.excerpt || "No excerpt available."}`,
                "",
                String(inspection.contentPreview || "No content preview available.").slice(0, 900)
              ].join("\n");
            }
          } catch (error) {
            assistantText = `Site inspection failed: ${error instanceof Error ? error.message : "unknown error"}`;
          }
        }
      } else if (learnCommand) {
        try {
          const currentMode = getActiveMode(session);
          const learning = await requestLearningStatus(currentMode, learnCommand.query || "");
          const updatedLabel = Number.isFinite(learning.updatedAt) && learning.updatedAt > 0
            ? new Date(learning.updatedAt).toLocaleString()
            : "unknown";
          const preview = learning.entries
            .slice(0, 3)
            .map((entry, index) => {
              const fact = Array.isArray(entry?.facts) && entry.facts.length ? entry.facts[0] : null;
              return `${index + 1}. **${String(entry?.query || "(no query)")}** (${String(entry?.mode || "auto")})${fact ? `\n   - ${String(fact.title || "fact")}` : ""}`;
            })
            .join("\n");

          assistantText = [
            `Internet learning memory status (mode: **${currentMode}**)`,
            `- Entries: **${learning.count}**`,
            `- Updated: **${updatedLabel}**`,
            preview ? `\nRecent learned entries:\n${preview}` : "\nNo learned entries found yet."
          ].join("\n");
        } catch (error) {
          assistantText = `Learning memory lookup failed: ${error instanceof Error ? error.message : "unknown error"}`;
        }
      } else {
        assistantText = "Rendering command received.";
      }

      if (liveCommandAssistantBody) {
        updateAssistantMessageBody(liveCommandAssistantBody, assistantText || "Done.");
        if (assistantMediaMeta) {
          const mediaCard = createGeneratedMediaCard(assistantMediaMeta);
          if (mediaCard) {
            const spacer = document.createElement("div");
            spacer.className = "generated-image-spacer";
            liveCommandAssistantBody.appendChild(spacer);
            liveCommandAssistantBody.appendChild(mediaCard);
          }
        }
      } else {
        appendMessage("assistant", assistantText, {
          model: session.model || "omni",
          mode: getActiveMode(session),
          timestamp: Date.now(),
          ...(assistantMediaMeta || {})
        });
      }

      session.messages.push({
        role: "assistant",
        content: assistantText,
        timestamp: Date.now(),
        ...(assistantMediaMeta || {})
      });
      updateSessionMetaFromMessages(session);
      saveState();
      renderSessionsSidebar();
      playNotificationSound("assistant");

      if (inputEl) {
        inputEl.value = "";
        focusInputIfAppropriate();
      }
      return;
    }

    const safetyProfile = buildSafetyProfile();
    const policy = evaluatePromptPolicy(trimmed, safetyProfile);
    if (policy.blocked) {
      const blockTs = Date.now();
      session.messages.push({ role: "user", content: trimmed, timestamp: blockTs });
      appendMessage("user", trimmed, {
        model: session.model || "omni",
        mode: getActiveMode(session),
        timestamp: blockTs
      });

      appendMessage("assistant", policy.message, {
        model: session.model || "omni",
        mode: getActiveMode(session),
        timestamp: Date.now()
      });

      session.messages.push({
        role: "assistant",
        content: policy.message,
        timestamp: Date.now()
      });
      updateSessionMetaFromMessages(session);
      saveState();
      renderSessionsSidebar();

      if (inputEl) {
        inputEl.value = "";
        focusInputIfAppropriate();
      }
      return;
    }

    checkApiStatus().catch(() => {});

    // Push user message
    session.messages.push({ role: "user", content: trimmed, timestamp: Date.now() });
    updateSessionMetaFromMessages(session);
    saveState();

    let activeMode = getActiveMode(session);
    
    // Auto-detect mode based on user content
    if (activeMode === "auto" && runtimeSettings.autoDetectMode) {
      const detected = detectModeFromContent(trimmed, session);
      if (detected?.mode) {
        activeMode = normalizeMode(detected.mode) || "auto";
        updateModelInspector(session.model || "omni", `mode:${activeMode}`);
      }
    }

    const conversationHints = buildConversationHints(session, activeMode, trimmed);

    if (activeMode === "simulation") {
      const simulation = ensureSimulationState(session);
      if (simulation.status !== "active") {
        simulation.status = "active";
        appendSimulationLog(session, "Simulation started from chat input.");
      }

      simulation.steps = Number(simulation.steps || 0) + 1;
      appendSimulationLog(session, `Step ${simulation.steps}: user input processed.`);
      updateSimulationUI(session);
    }
    
    appendMessage("user", trimmed, {
      model: session.model || "omni",
      mode: activeMode,
      timestamp: Date.now()
    });
    playNotificationSound("send");

    // Clear input
    if (inputEl) inputEl.value = "";

    const mediaIntent = detectAutoMediaIntent(trimmed);

    const shouldGenerateImage = mediaIntent.kind === "image";
    if (shouldGenerateImage) {
      const assistantMessage = appendMessage("assistant", "Generating image...", {
        model: session.model || "omni",
        mode: activeMode
      });
      const assistantBodyEl = assistantMessage ? assistantMessage.body : null;

      isStreaming = true;
      if (sendBtn) sendBtn.disabled = true;
      if (inputEl) inputEl.disabled = true;
      if (typingIndicatorEl) typingIndicatorEl.style.display = "block";

      try {
        const imagePrompt = String(mediaIntent.prompt || extractImagePrompt(trimmed) || trimmed).trim();
        const imageResult = await requestGeneratedImage(session, imagePrompt, safetyProfile);
        const generatedAt = Date.now();
        const resolution = String(imageResult?.metadata?.resolution || "").trim() || IMAGE_EXPORT_RESOLUTION_LABEL;
        const styleId = String(imageResult?.metadata?.style_id || "").trim();

        updateModelInspector(imageResult.modelUsed || session.model || "omni", "image-generated");

        if (assistantBodyEl) {
          assistantBodyEl.innerHTML = renderMarkdown(`Generated image for: **${imagePrompt}**`);
          const imageCard = createGeneratedImageCard({
            imageDataUrl: imageResult.imageDataUrl,
            imageFilename: imageResult.filename,
            imagePrompt,
            imageResolution: resolution,
            imageStyleId: styleId,
            generatedAt
          });
          if (imageCard) {
            const spacer = document.createElement("div");
            spacer.className = "generated-image-spacer";
            assistantBodyEl.appendChild(spacer);
            assistantBodyEl.appendChild(imageCard);
          }
          smoothScrollToBottom(true);
        }

        session.messages.push({
          role: "assistant",
          content: `Generated image for: ${imagePrompt}`,
          type: "image",
          imageDataUrl: imageResult.imageDataUrl,
          imageFilename: imageResult.filename,
          imagePrompt,
          imageResolution: resolution,
          imageStyleId: styleId,
          generatedAt,
          timestamp: Date.now()
        });
        updateSessionMetaFromMessages(session);
        saveState();
        playNotificationSound("assistant");

        if (runtimeSettings.showTimestamps || runtimeSettings.compactMode) {
          renderActiveSessionMessages();
        }
      } catch (err) {
        console.error("Omni image generation error:", err);
        const reason = String(err?.message || "").trim();
        updateAssistantMessageBody(
          assistantBodyEl,
          reason
            ? `[Error] Image generation failed: ${reason}`
            : "[Error] Image generation failed. Try a different image prompt."
        );
        playNotificationSound("error");
      } finally {
        isStreaming = false;
        updateJumpToLatestVisibility();
        if (sendBtn) sendBtn.disabled = false;
        if (inputEl) inputEl.disabled = false;
        if (typingIndicatorEl) typingIndicatorEl.style.display = "none";
        focusInputIfAppropriate();
      }

      return;
    }

    // Prepare assistant placeholder
    const assistantMessage = appendMessage("assistant", "", {
      model: session.model || "omni",
      mode: activeMode
    });
    const assistantBodyEl = assistantMessage ? assistantMessage.body : null;

    // UI state
    isStreaming = true;
    if (sendBtn) sendBtn.disabled = true;
    if (inputEl) inputEl.disabled = true;
    if (typingIndicatorEl) typingIndicatorEl.style.display = "block";

    session._streamingAssistantText = "";
    let streamingRenderFrameId = 0;

    const flushStreamingRender = () => {
      streamingRenderFrameId = 0;
      updateAssistantMessageBody(assistantBodyEl, session._streamingAssistantText || "", { highlight: false });
    };

    try {
      await streamOmniResponse(
        session,
        (chunk) => {
          if (chunk && typeof chunk === "object") {
            const payload = chunk;
            session._streamingMeta = {
              route: String(payload.route || "").trim(),
              imageDataUrl: String(payload.imageDataUrl || "").trim(),
              imageFilename: String(payload?.image?.filename || "").trim(),
              imageResolution: String(payload?.image?.metadata?.resolution || "").trim() || IMAGE_EXPORT_RESOLUTION_LABEL,
              imageStyleId: String(payload?.image?.metadata?.style_id || "").trim(),
              imagePrompt: trimmed,
              generatedAt: Date.now()
            };
            if (typeof payload.content === "string") {
              session._streamingAssistantText = appendTokenWithSpacing(
                session._streamingAssistantText,
                payload.content
              );
            }
          } else {
            session._streamingAssistantText = appendTokenWithSpacing(
              session._streamingAssistantText,
              chunk
            );
          }

          if (!streamingRenderFrameId) {
            streamingRenderFrameId = requestAnimationFrame(flushStreamingRender);
          }
        },
        (meta) => {
          updateModelInspector(meta?.modelUsed || session.model || "omni", meta?.routeReason || "");

          if (getActiveMode(session) === "simulation") {
            const simulation = ensureSimulationState(session);
            if (meta?.simulationId) simulation.id = meta.simulationId;
            if (meta?.simulationStatus) simulation.status = meta.simulationStatus;
            if (Number.isFinite(meta?.simulationSteps) && meta.simulationSteps >= 0) {
              simulation.steps = meta.simulationSteps;
            }
            appendSimulationLog(session, `Backend sync: ${simulation.status}, steps ${simulation.steps}.`);
            updateSimulationUI(session);
          }
        },
        safetyProfile,
        activeMode,
        conversationHints
      );

      if (streamingRenderFrameId) {
        cancelAnimationFrame(streamingRenderFrameId);
        flushStreamingRender();
      }

      const finalText = (session._streamingAssistantText || "").trim();
      const safeText = finalText || "[No response received]";
      updateAssistantMessageBody(assistantBodyEl, safeText);

      const streamedMeta = session._streamingMeta || {};
      if (assistantBodyEl && streamedMeta.imageDataUrl) {
        const imageCard = createGeneratedImageCard({
          imageDataUrl: streamedMeta.imageDataUrl,
          imageFilename: streamedMeta.imageFilename,
          imagePrompt: streamedMeta.imagePrompt || trimmed,
          imageResolution: streamedMeta.imageResolution,
          imageStyleId: streamedMeta.imageStyleId,
          generatedAt: streamedMeta.generatedAt || Date.now()
        });
        if (imageCard) {
          const spacer = document.createElement("div");
          spacer.className = "generated-image-spacer";
          assistantBodyEl.appendChild(spacer);
          assistantBodyEl.appendChild(imageCard);
        }
      }

      session.messages.push({
        role: "assistant",
        content: safeText,
        type: streamedMeta.imageDataUrl ? "image" : "text",
        imageDataUrl: streamedMeta.imageDataUrl || "",
        imageFilename: streamedMeta.imageFilename || "",
        imagePrompt: streamedMeta.imagePrompt || "",
        imageResolution: streamedMeta.imageResolution || "",
        imageStyleId: streamedMeta.imageStyleId || "",
        generatedAt: streamedMeta.generatedAt || Date.now()
      });
      session.messages[session.messages.length - 1].timestamp = Date.now();
      if (getActiveMode(session) === "simulation") {
        appendSimulationLog(session, "Assistant produced simulation state update.");
      }
      delete session._streamingAssistantText;
      delete session._streamingMeta;
      updateSessionMetaFromMessages(session);
      saveState();
      playNotificationSound("assistant");

      if (runtimeSettings.showTimestamps || runtimeSettings.compactMode) {
        renderActiveSessionMessages();
      }
    } catch (err) {
      if (streamingRenderFrameId) {
        cancelAnimationFrame(streamingRenderFrameId);
        streamingRenderFrameId = 0;
      }
      console.error("Omni streaming error:", err);
      updateAssistantMessageBody(
        assistantBodyEl,
        "[Error] Something went wrong while streaming the response."
      );
      playNotificationSound("error");
    } finally {
      isStreaming = false;
      updateJumpToLatestVisibility();
      if (sendBtn) sendBtn.disabled = false;
      if (inputEl) inputEl.disabled = false;
      if (typingIndicatorEl) typingIndicatorEl.style.display = "none";
      focusInputIfAppropriate();
    }
  }

  // =========================
  // 7. UI ENGINE (SCROLL, INPUT)
  // =========================
  let scrollTimeout = null;
  let shouldStickToBottom = true;
  let jumpToLatestBtn = null;

  function ensureJumpToLatestPill() {
    if (jumpToLatestBtn || !messagesEl) return;

    const chatArea = messagesEl.closest("#chat-area");
    if (!chatArea) return;

    jumpToLatestBtn = document.createElement("button");
    jumpToLatestBtn.type = "button";
    jumpToLatestBtn.className = "jump-to-latest";
    jumpToLatestBtn.textContent = "Jump to latest";
    jumpToLatestBtn.setAttribute("aria-label", "Jump to latest message");

    jumpToLatestBtn.addEventListener("click", () => {
      shouldStickToBottom = true;
      smoothScrollToBottom(true);
      updateJumpToLatestVisibility();
    });

    chatArea.appendChild(jumpToLatestBtn);
  }

  function updateJumpToLatestVisibility() {
    if (!jumpToLatestBtn) return;
    const shouldShow = isStreaming && !shouldStickToBottom;
    jumpToLatestBtn.classList.toggle("visible", shouldShow);
  }

  function isNearBottom() {
    if (!messagesEl) return true;
    const distanceFromBottom = messagesEl.scrollHeight - messagesEl.clientHeight - messagesEl.scrollTop;
    return distanceFromBottom <= 96;
  }

  function smoothScrollToBottom(force = false) {
    if (!messagesEl) return;
    if (!force && (!runtimeSettings.autoScroll || !shouldStickToBottom)) return;
    if (scrollTimeout) cancelAnimationFrame(scrollTimeout);

    const start = messagesEl.scrollTop;
    const end = messagesEl.scrollHeight - messagesEl.clientHeight;
    const duration = 200;
    const startTime = performance.now();

    function animate(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      messagesEl.scrollTop = start + (end - start) * eased;
      if (t < 1) {
        scrollTimeout = requestAnimationFrame(animate);
      }
    }

    scrollTimeout = requestAnimationFrame(animate);
    if (force) {
      shouldStickToBottom = true;
      updateJumpToLatestVisibility();
    }
  }

  function autoResizeInput() {
    if (!inputEl) return;
    inputEl.style.height = "auto";
    inputEl.style.height = inputEl.scrollHeight + "px";
  }

  // =========================
  // 8. SESSION SIDEBAR ENGINE
  // =========================
  function renderSessionsSidebar() {
    if (!sessionsSidebarEl) return;
    sessionsSidebarEl.innerHTML = "";

    const ids = Object.keys(state.sessions).sort((a, b) => {
      return state.sessions[b].updatedAt - state.sessions[a].updatedAt;
    });

    for (const id of ids) {
      const session = state.sessions[id];

      const item = document.createElement("div");
      item.className = "session-item";
      if (id === state.activeSessionId) {
        item.classList.add("session-item-active");
      }

      const title = document.createElement("div");
      title.className = "session-title";
      title.textContent = session.title || "New conversation";

      const meta = document.createElement("div");
      meta.className = "session-meta";
      const date = new Date(session.updatedAt || session.createdAt);
      meta.textContent = date.toLocaleString();

      item.appendChild(title);
      item.appendChild(meta);

      item.title = "";

      item.addEventListener("click", () => {
        setActiveSession(id);
      });

      // Right-click delete
      item.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (confirm("Delete this conversation?")) {
          deleteSession(id);
        }
      });

      sessionsSidebarEl.appendChild(item);
    }
  }

  // =========================
  // 9. INPUT ENGINE
  // =========================
  function handleSendClick() {
    if (!inputEl) return;
    const content = inputEl.value || "";
    sendMessage(content);
  }

  function handleInputKeydown(e) {
    const shouldSendWithEnter = runtimeSettings.sendWithEnter;
    const wantsSend = shouldSendWithEnter
      ? e.key === "Enter" && !e.shiftKey
      : e.key === "Enter" && (e.ctrlKey || e.metaKey);

    if (wantsSend) {
      e.preventDefault();
      handleSendClick();
    }
  }

  async function loadPreferences() {
    try {
      const res = await fetch("/api/preferences", { method: "GET" });
      if (!res.ok) return;

      const data = await res.json();
      const session = getActiveSession();
      if (!session || !data) return;

      const preferredMode = normalizeMode(data.preferredMode) || session.mode || "auto";
      const preferredImageStyle = normalizeImageStyle(data?.lastUsedSettings?.preferredImageStyle || "");
      const preferredImageCamera = normalizeCameraProfile(data?.lastUsedSettings?.preferredImageCamera || "") || "prime-85mm";
      const preferredImageLighting = normalizeLightingProfile(data?.lastUsedSettings?.preferredImageLighting || "") || "studio-soft";
      const preferredImageMaterials = normalizeMaterialList(data?.lastUsedSettings?.preferredImageMaterials || "") || ["skin"];
      session.mode = preferredMode;
      session.imageStyle = preferredImageStyle;
      session.imageCamera = preferredImageCamera;
      session.imageLighting = preferredImageLighting;
      session.imageMaterials = preferredImageMaterials;
      session.updatedAt = Date.now();
      saveState();
      syncSelectorsFromSession();
    } catch {
      // ignore
    }
  }

  function setMode(mode) {
    const session = getActiveSession();
    if (!session) return;

    session.mode = normalizeMode(mode) || "auto";
    ensureSimulationState(session);
    session.updatedAt = Date.now();
    saveState();
    updateModeButton(session.mode);
    setActiveDropdownItem(modeMenu, session.mode);
    updateModeIndicator(session.mode);
    updateSimulationUI(session);
    renderSessionsSidebar();
  }

  function startSimulation() {
    const session = getActiveSession();
    if (!session || getActiveMode(session) !== "simulation") return;
    const simulation = ensureSimulationState(session);
    simulation.status = "active";
    appendSimulationLog(session, "Simulation started.");
    session.updatedAt = Date.now();
    saveState();
    updateSimulationUI(session);
  }

  function pauseSimulation() {
    const session = getActiveSession();
    if (!session || getActiveMode(session) !== "simulation") return;
    const simulation = ensureSimulationState(session);
    simulation.status = "paused";
    appendSimulationLog(session, "Simulation paused.");
    session.updatedAt = Date.now();
    saveState();
    updateSimulationUI(session);
  }

  function resetSimulation() {
    const session = getActiveSession();
    if (!session || getActiveMode(session) !== "simulation") return;
    const simulation = ensureSimulationState(session);
    simulation.id = `sim_${Date.now()}`;
    simulation.status = "inactive";
    simulation.steps = 0;
    simulation.logs = [];
    appendSimulationLog(session, "Simulation reset.");
    session.updatedAt = Date.now();
    saveState();
    updateSimulationUI(session);
  }

  function exportSimulationState() {
    const session = getActiveSession();
    if (!session || getActiveMode(session) !== "simulation") return;
    const simulation = ensureSimulationState(session);
    const payload = {
      sessionId: session.id,
      exportedAt: new Date().toISOString(),
      simulation
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${simulation.id || "simulation"}-state.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
    appendSimulationLog(session, "Simulation state exported.");
    updateSimulationUI(session);
  }

  // =========================
  // 10. INIT
  // =========================
  function init() {
    installMobileViewportHandlers();
    loadRuntimeSettings();
    applyRuntimeSettings();
    loadState();
    syncSelectorsFromSession();
    renderSessionsSidebar();
    renderActiveSessionMessages();
    startApiChecks();
    updateModelInspector("omni", "omni-locked");
    loadPreferences();
    updateSimulationUI();
    updateAgeGateComposerNotice();
    updateLegalAttestationComposerNotice();

    // Listen for settings changes from other tabs or same page
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY && e.newValue === null) {
        resetToFreshChat();
        return;
      }

      if (e.key === SETTINGS_KEYS.DEFAULT_MODE || e.key === SETTINGS_KEYS.MODE_SELECTION) {
        const session = getActiveSession();
        if (session) {
          const newMode = getSelectedModeFromSettings();
          session.mode = newMode;
          saveState();
          updateModeIndicator(newMode);
          syncSelectorsFromSession();
        }
      }

      if (
        e.key === SETTINGS_KEYS.AUTO_SCROLL ||
        e.key === SETTINGS_KEYS.FONT_SIZE ||
        e.key === SETTINGS_KEYS.SOUND ||
        e.key === SETTINGS_KEYS.SHOW_TIMESTAMPS ||
        e.key === SETTINGS_KEYS.COMPACT_MODE ||
        e.key === SETTINGS_KEYS.MOBILE_COMPACT_MODE ||
        e.key === SETTINGS_KEYS.REQUEST_TIMEOUT
      ) {
        loadRuntimeSettings();
        applyRuntimeSettings();
        renderActiveSessionMessages();
      }

      if (e.key === SETTINGS_KEYS.DEFAULT_MODEL) {
        const session = getActiveSession();
        if (session) {
          session.model = getDefaultModelFromSettings();
          session.updatedAt = Date.now();
          saveState();
          syncSelectorsFromSession();
          renderSessionsSidebar();
        }
      }

      if (e.key === AGE_PROFILE_KEY) {
        updateAgeGateComposerNotice();
      }

      if (e.key === LEGAL_PROFILE_KEY) {
        updateLegalAttestationComposerNotice();
      }
    });

    // Listen for same-page settings events
    window.addEventListener("omni-settings-changed", (e) => {
      const { key } = e.detail;
      if (key === STORAGE_KEY) {
        resetToFreshChat();
        return;
      }

      if (key === SETTINGS_KEYS.DEFAULT_MODE || key === SETTINGS_KEYS.MODE_SELECTION) {
        const session = getActiveSession();
        if (session) {
          const newMode = getSelectedModeFromSettings();
          session.mode = newMode;
          saveState();
          updateModeIndicator(newMode);
          syncSelectorsFromSession();
        }
      }

      if (
        key === SETTINGS_KEYS.AUTO_SCROLL ||
        key === SETTINGS_KEYS.FONT_SIZE ||
        key === SETTINGS_KEYS.SOUND ||
        key === SETTINGS_KEYS.SHOW_TIMESTAMPS ||
        key === SETTINGS_KEYS.COMPACT_MODE ||
        key === SETTINGS_KEYS.MOBILE_COMPACT_MODE ||
        key === SETTINGS_KEYS.SEND_WITH_ENTER ||
        key === SETTINGS_KEYS.SHOW_ASSISTANT_BADGES ||
        key === SETTINGS_KEYS.AUTO_DETECT_MODE ||
        key === SETTINGS_KEYS.REQUEST_TIMEOUT ||
        key === SETTINGS_KEYS.API_HEALTH_INTERVAL ||
        key === SETTINGS_KEYS.API_RETRIES
      ) {
        loadRuntimeSettings();
        applyRuntimeSettings();
        renderActiveSessionMessages();
        if (key === SETTINGS_KEYS.API_HEALTH_INTERVAL) {
          startApiChecks();
        }
      }

      if (key === SETTINGS_KEYS.DEFAULT_MODEL) {
        const session = getActiveSession();
        if (session) {
          session.model = getDefaultModelFromSettings();
          session.updatedAt = Date.now();
          saveState();
          syncSelectorsFromSession();
          renderSessionsSidebar();
        }
      }
    });

    window.addEventListener("omni-age-profile-changed", () => {
      const session = getActiveSession();
      updateAgeGateComposerNotice();
      if (!session) return;
    });

    window.addEventListener("omni-legal-attestation-changed", () => {
      updateLegalAttestationComposerNotice();
    });

    if (modelBtn && modelDropdown) {
      modelBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const willOpen = !modelDropdown.classList.contains("open");
        closeAllDropdowns();
        setDropdownOpen(modelDropdown, modelBtn, willOpen);
      });
    }

    if (modelMenu) {
      modelMenu.addEventListener("click", (e) => {
        const optionBtn = e.target.closest(".chat-dropdown-item[data-value]");
        if (!optionBtn) return;
        const session = getActiveSession();
        if (!session) return;
        session.model = normalizeModel(optionBtn.dataset.value) || "omni";
        session.updatedAt = Date.now();
        saveState();
        updateModelButton(session.model);
        setActiveDropdownItem(modelMenu, session.model);
        updateModelInspector(session.model, "manual-selection");
        closeAllDropdowns();
        renderSessionsSidebar();
      });
    }

    if (modeBtn && modeDropdown) {
      modeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const willOpen = !modeDropdown.classList.contains("open");
        closeAllDropdowns();
        setDropdownOpen(modeDropdown, modeBtn, willOpen);
      });
    }

    if (modeMenu) {
      modeMenu.addEventListener("click", (e) => {
        const optionBtn = e.target.closest(".chat-dropdown-item[data-value]");
        if (!optionBtn) return;
        setMode(normalizeMode(optionBtn.dataset.value) || getSelectedModeFromSettings());
        const session = getActiveSession();
        if (!session) return;
        const shouldPersistManualMode = getSettingBool(SETTINGS_KEYS.PERSIST_MANUAL_MODE, true);
        if (shouldPersistManualMode) {
          try {
            localStorage.setItem(SETTINGS_KEYS.MODE_SELECTION, "manual");
            localStorage.setItem(SETTINGS_KEYS.DEFAULT_MODE, session.mode);
          } catch {
            // ignore
          }
        }
        closeAllDropdowns();
      });
    }

    if (simulationStartBtn) {
      simulationStartBtn.addEventListener("click", startSimulation);
    }

    if (simulationPauseBtn) {
      simulationPauseBtn.addEventListener("click", pauseSimulation);
    }

    if (simulationResetBtn) {
      simulationResetBtn.addEventListener("click", resetSimulation);
    }

    if (simulationExportBtn) {
      simulationExportBtn.addEventListener("click", exportSimulationState);
    }

    if (simulationRulesEditorEl) {
      simulationRulesEditorEl.addEventListener("change", () => {
        const session = getActiveSession();
        if (!session || getActiveMode(session) !== "simulation") return;
        const simulation = ensureSimulationState(session);
        simulation.rules = String(simulationRulesEditorEl.value || "").trim();
        appendSimulationLog(session, "Simulation rules updated from editor.");
        session.updatedAt = Date.now();
        saveState();
        updateSimulationUI(session);
      });
    }

    document.addEventListener("click", (e) => {
      if (e.target.closest(".dropdown-control")) return;
      closeAllDropdowns();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAllDropdowns();
      }
    });

    if (sendBtn) {
      sendBtn.addEventListener("click", handleSendClick);
    }

    if (openLegalAttestationBtn) {
      openLegalAttestationBtn.addEventListener("click", () => {
        openLegalAttestationModal();
      });
    }
    if (inputEl) {
      inputEl.addEventListener("keydown", handleInputKeydown);
      inputEl.addEventListener("input", autoResizeInput);
      autoResizeInput();

      try {
        const queuedPrompt = localStorage.getItem("omni-tools-prompt") || "";
        if (queuedPrompt.trim()) {
          inputEl.value = queuedPrompt;
          localStorage.removeItem("omni-tools-prompt");
          autoResizeInput();
        }
      } catch {
        // ignore queued prompt failures
      }
    }
    if (messagesEl) {
      ensureJumpToLatestPill();
      messagesEl.addEventListener("scroll", () => {
        shouldStickToBottom = isNearBottom();
        updateJumpToLatestVisibility();
      });
      shouldStickToBottom = true;
      updateJumpToLatestVisibility();
    }
    if (newSessionBtn) {
      newSessionBtn.addEventListener("click", () => {
        createNewSession();
        saveState();
        syncSelectorsFromSession();
        renderSessionsSidebar();
        renderActiveSessionMessages();
      });
    }

    closeAllDropdowns();

  }

  init();
})();