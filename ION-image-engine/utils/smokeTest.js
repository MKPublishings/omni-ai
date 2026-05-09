const { IONImageGenerate } = require("../index");

async function expectReject(label, value) {
    let failedAsExpected = false;

    try {
        await IONImageGenerate(value);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("non-empty prompt string")) {
            failedAsExpected = true;
            console.log(`✓ ${label}: rejected with guard message`);
        } else {
            throw new Error(`${label}: rejected with unexpected message: ${message}`);
        }
    }

    if (!failedAsExpected) {
        throw new Error(`${label}: expected rejection but call succeeded`);
    }
}

async function expectRejectWithMessage(label, prompt, options, expectedMessagePart) {
    let failedAsExpected = false;

    try {
        await IONImageGenerate(prompt, options);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes(expectedMessagePart)) {
            failedAsExpected = true;
            console.log(`✓ ${label}: rejected retired legacy route`);
        } else {
            throw new Error(`${label}: rejected with unexpected message: ${message}`);
        }
    }

    if (!failedAsExpected) {
        throw new Error(`${label}: expected rejection but call succeeded`);
    }
}

async function run() {
    await expectReject("null prompt", null);
    await expectReject("empty string prompt", "");
    await expectReject("object prompt", { text: "castle at dawn" });
    await expectRejectWithMessage(
        "legacy OpenAI model",
        "castle at dawn",
        { model: "ION_openai" },
        "has been retired"
    );

    console.log("Image engine smoke test passed.");
}

run().catch((error) => {
    console.error("Image engine smoke test failed:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
