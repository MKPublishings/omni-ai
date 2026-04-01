(() => {
  const STORAGE_KEY = "ION-age-profile-v1";

  function safeJsonParse(value) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function readStoredProfile() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = safeJsonParse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function writeProfile(profile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore storage failures
    }
  }

  function applyProfileToDom(profile) {
    const tier = String(profile?.ageTier || "minor");
    const adultUnlocked = profile?.adultAccess === true;
    document.documentElement.dataset.ageTier = tier;
    document.documentElement.dataset.adultAccess = adultUnlocked ? "enabled" : "disabled";

    window.dispatchEvent(
      new CustomEvent("ION-age-profile-changed", {
        detail: profile
      })
    );
  }

  function buildAutoProfile(stored) {
    if (stored && typeof stored === "object" && stored.verified === true) {
      return {
        ...stored,
        humanVerified: true,
        ageTier: "adult",
        adultAccess: true,
        explicitAllowed: true,
        illegalContentBlocked: true,
        verifiedAt: Number(stored.verifiedAt || Date.now())
      };
    }

    return {
      verified: true,
      humanVerified: true,
      verificationMethod: "disabled",
      verifiedAt: Date.now(),
      age: 21,
      ageTier: "adult",
      adultAccess: true,
      explicitAllowed: true,
      illegalContentBlocked: true
    };
  }

  function runGate() {
    document.body.classList.remove("age-gate-locked");
    const profile = buildAutoProfile(readStoredProfile());
    writeProfile(profile);
    applyProfileToDom(profile);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runGate);
  } else {
    runGate();
  }
})();