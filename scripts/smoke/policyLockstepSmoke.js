const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { SAFE_PROMPTS, ILLEGAL_PROMPTS } = require("./policyPromptFixtures");

function extractFunctionSource(fileSource, functionName) {
  const startToken = `function ${functionName}`;
  const startIndex = fileSource.indexOf(startToken);
  if (startIndex === -1) {
    throw new Error(`Unable to find ${functionName}`);
  }

  const bodyStart = fileSource.indexOf("{", startIndex);
  if (bodyStart === -1) {
    throw new Error(`Unable to parse ${functionName} body start`);
  }

  let depth = 0;
  let endIndex = -1;
  for (let index = bodyStart; index < fileSource.length; index += 1) {
    const char = fileSource[index];
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        endIndex = index;
        break;
      }
    }
  }

  if (endIndex === -1) {
    throw new Error(`Unable to parse ${functionName} body end`);
  }

  return fileSource.slice(startIndex, endIndex + 1);
}

function extractRegexLiteral(functionSource, constName) {
  const matcher = new RegExp(`const\\s+${constName}\\s*=\\s*(\\/[\\s\\S]*?\\/[gimsuy]*);`);
  const match = functionSource.match(matcher);
  if (!match) {
    throw new Error(`Unable to find ${constName} regex literal`);
  }
  return match[1].trim();
}

function loadClientPolicyFn() {
  const chatPath = path.join(__dirname, "..", "..", "public", "scripts", "chat.js");
  const source = fs.readFileSync(chatPath, "utf8");
  const fnSource = extractFunctionSource(source, "evaluatePromptPolicy");
  const script = `${fnSource}\nmodule.exports = evaluatePromptPolicy;`;
  const sandbox = { module: { exports: null }, exports: {}, console };
  vm.runInNewContext(script, sandbox, { filename: "client-policy.vm.js" });
  return { fn: sandbox.module.exports, source: fnSource };
}

function loadServerPolicyFn() {
  const serverPath = path.join(__dirname, "..", "..", "src", "index.ts");
  const source = fs.readFileSync(serverPath, "utf8");
  const startToken = "function evaluateSexualSafetyPrompt";
  const endToken = "function normalizeImageGenerationError";
  const startIndex = source.indexOf(startToken);
  if (startIndex === -1) {
    throw new Error("Unable to locate evaluateSexualSafetyPrompt in src/index.ts");
  }
  const endIndex = source.indexOf(endToken, startIndex);
  if (endIndex === -1) {
    throw new Error("Unable to locate function boundary after evaluateSexualSafetyPrompt in src/index.ts");
  }

  const fnSource = source.slice(startIndex, endIndex);
  const directIllegalPattern = new RegExp(extractRegexLiteral(fnSource, "directIllegalPattern").replace(/^\//, "").replace(/\/[gimsuy]*$/, ""), "i");
  const illegalMinorSexualPattern = new RegExp(extractRegexLiteral(fnSource, "illegalMinorSexualPattern").replace(/^\//, "").replace(/\/[gimsuy]*$/, ""), "i");
  const illegalAssaultPattern = new RegExp(extractRegexLiteral(fnSource, "illegalAssaultPattern").replace(/^\//, "").replace(/\/[gimsuy]*$/, ""), "i");

  const fn = (text) => {
    const input = String(text || "").toLowerCase();
    if (
      directIllegalPattern.test(input) ||
      illegalMinorSexualPattern.test(input) ||
      illegalAssaultPattern.test(input)
    ) {
      return { blocked: true, reason: "illegal-content-blocked" };
    }
    return { blocked: false, reason: "allowed" };
  };

  return { fn, source: fnSource };
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const client = loadClientPolicyFn();
  const server = loadServerPolicyFn();

  const regexNames = ["directIllegalPattern", "illegalMinorSexualPattern", "illegalAssaultPattern"];
  for (const regexName of regexNames) {
    const clientRegex = extractRegexLiteral(client.source, regexName);
    const serverRegex = extractRegexLiteral(server.source, regexName);
    expect(
      clientRegex === serverRegex,
      `${regexName} mismatch between client and server policy functions`);
    console.log(`✓ ${regexName}: in sync`);
  }

  for (const entry of ILLEGAL_PROMPTS) {
    const clientResult = client.fn(entry.prompt, { explicitAllowed: true });
    const serverResult = server.fn(entry.prompt, { explicitAllowed: true });
    expect(clientResult?.blocked === true, `Client should block illegal prompt: ${entry.prompt}`);
    expect(serverResult?.blocked === true, `Server should block illegal prompt: ${entry.prompt}`);
    console.log(`✓ illegal prompt parity: blocked`);
  }

  for (const entry of SAFE_PROMPTS) {
    const clientResult = client.fn(entry.prompt, { explicitAllowed: false });
    const serverResult = server.fn(entry.prompt, { explicitAllowed: false });
    expect(clientResult?.blocked === false, `Client should allow safe prompt: ${entry.prompt}`);
    expect(serverResult?.blocked === false, `Server should allow safe prompt: ${entry.prompt}`);
    console.log(`✓ safe prompt parity: allowed`);
  }

  console.log("Policy lockstep smoke test passed.");
}

try {
  run();
} catch (error) {
  console.error("Policy lockstep smoke test failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
