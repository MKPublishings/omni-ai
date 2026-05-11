function countRequestedSubjects(prompt) {
    const lower = String(prompt || "").toLowerCase();

    if (/\b(crowd|group|team|family|people|characters)\b/.test(lower)) {
        return 3;
    }
    if (/\b(couple|duo|two people|two characters|pair)\b/.test(lower)) {
        return 2;
    }
    if (/\b(single subject|solo|portrait|headshot|selfie|one person|one character|individual)\b/.test(lower)) {
        return 1;
    }

    return 0;
}

function inferCaptureMode(prompt) {
    const lower = String(prompt || "").toLowerCase();

    if (/\b(product|packshot|still life|device|watch|bottle|shoe|chair|furniture)\b/.test(lower)) {
        return "product";
    }
    if (/\b(interior|room|bedroom|office|studio|kitchen|architecture|lobby)\b/.test(lower)) {
        return "environment";
    }
    if (/\b(landscape|vista|mountain|forest|cityscape|street scene|panorama)\b/.test(lower)) {
        return "scene";
    }
    if (/\b(portrait|headshot|selfie|face|person|model|editorial)\b/.test(lower)) {
        return "portrait";
    }

    return "general";
}

function shouldUsePhotogrammetry(prompt, options = {}) {
    if (options.isAnimePrompt) {
        return false;
    }

    const lower = String(prompt || "").toLowerCase();
    if (/\b(anime|manga|cel|chibi|cartoon|illustration)\b/.test(lower)) {
        return false;
    }

    return true;
}

function buildPositiveTags(prompt, captureMode, requestedSubjects) {
    const tags = [
        "photogrammetry-grade scene reconstruction",
        "stable lens geometry",
        "clean occlusion boundaries",
        "resolved foreground midground background separation",
        "single coherent light transport",
        "material-consistent surfaces",
        "artifact-free edge transitions"
    ];

    if (requestedSubjects === 1) {
        tags.push(
            "single clearly isolated subject",
            "unobscured face and body silhouette unless requested",
            "non-overlapping limbs and features"
        );
    }

    if (requestedSubjects > 1) {
        tags.push(
            "distinct subject spacing",
            "independent silhouettes for each subject",
            "staged poses with no merged anatomy"
        );
    }

    if (captureMode === "portrait") {
        tags.push(
            "true-to-lens facial proportions",
            "clear eye visibility",
            "natural skin detail without smearing"
        );
    }

    if (captureMode === "product") {
        tags.push(
            "object-centered framing",
            "clean contour fidelity",
            "no floating or fused components"
        );
    }

    if (captureMode === "environment") {
        tags.push(
            "structurally consistent architecture",
            "parallel lines preserved where expected",
            "clean room-scale perspective"
        );
    }

    if (captureMode === "scene") {
        tags.push(
            "depth-aware environmental layering",
            "background elements fully separated from focal plane"
        );
    }

    return tags;
}

function buildNegativeTags(captureMode, requestedSubjects) {
    const tags = [
        "no overlapping anatomy",
        "no fused limbs",
        "no duplicate body parts",
        "no obscured facial features unless requested",
        "no depth halo artifacts",
        "no warped perspective",
        "no geometry collapse",
        "no texture smearing",
        "no muddy occlusion",
        "no floating objects"
    ];

    if (requestedSubjects <= 1) {
        tags.push("no extra people", "no duplicated subject");
    }

    if (requestedSubjects > 1) {
        tags.push("no merged faces", "no tangled poses", "no overlapping silhouettes");
    }

    if (captureMode === "portrait") {
        tags.push("no crossed eyes", "no malformed hands", "no waxy skin", "no hidden eyes");
    }

    if (captureMode === "product") {
        tags.push("no broken edges", "no asymmetrical duplication", "no clipped product parts");
    }

    if (captureMode === "environment") {
        tags.push("no impossible walls", "no bent door frames", "no inconsistent vanishing points");
    }

    return tags;
}

function buildPhotogrammetryBlueprint(prompt, options = {}) {
    if (!shouldUsePhotogrammetry(prompt, options)) {
        return {
            enabled: false,
            positiveTags: [],
            negativeTags: [],
            captureMode: "disabled",
            requestedSubjects: 0
        };
    }

    const requestedSubjects = countRequestedSubjects(prompt);
    const captureMode = inferCaptureMode(prompt);

    return {
        enabled: true,
        captureMode,
        requestedSubjects,
        positiveTags: buildPositiveTags(prompt, captureMode, requestedSubjects),
        negativeTags: buildNegativeTags(captureMode, requestedSubjects)
    };
}

module.exports = {
    buildPhotogrammetryBlueprint
};