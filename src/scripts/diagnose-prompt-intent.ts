import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { getCheckpointConfig } from '../image-gen/config/models.config';
import { parseIntent } from '../image-gen/orchestration/intent-parser';
import { optimizeParameters } from '../image-gen/orchestration/parameter-optimizer';
import { buildPhotogrammetryBlueprint } from '../image-gen/orchestration/photogrammetry-blueprint';
import { assemblePrompt } from '../image-gen/orchestration/prompt-assembler';
import { resolveStyleFamily } from '../image-gen/orchestration/style-router';
import { expandTags } from '../image-gen/orchestration/tag-expander';
import type { StyleFamilyId } from '../image-gen/shared/types';

interface PromptRegressionCase {
  id: string;
  category: string;
  prompt: string;
  subjectTerms: string[];
  allowPortrait?: boolean;
}

interface PromptRegressionSuite {
  suiteId: string;
  description?: string;
  defaults?: {
    checkpointId?: string;
    explicitStyleFamily?: StyleFamilyId | null;
  };
  cases: PromptRegressionCase[];
}

interface CaseReport {
  id: string;
  category: string;
  prompt: string;
  phase1: {
    parsedSubject: string;
    parsedSetting: string;
    parsedFraming: string;
    subjectWeight: number;
    styleWeight: number;
    subjectDominance: number;
    subjectMatch: boolean;
  };
  phase2: {
    styleFamily: StyleFamilyId;
    captureMode: string;
    portraitPriorTriggered: boolean;
    expandedTagCount: number;
  };
  phase3: {
    sampler: string;
    steps: number;
    cfgScale: number;
    hasHumanTokenInPositive: boolean;
    hasHumanSuppressionInNegative: boolean;
  };
  phase4: {
    recommendations: string[];
  };
  phase5: {
    passed: boolean;
  };
}

const STYLE_TERMS = new Set([
  'photo-realistic',
  'photorealistic',
  'realistic',
  'cinematic',
  'stylized',
  'anime',
  'hyperreal',
  'ultra-detailed',
  'dslr',
  '8k',
  '4k',
  'professional',
  'highly detailed',
]);

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function getArgValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index < 0 || index + 1 >= process.argv.length) {
    return null;
  }
  const value = String(process.argv[index + 1] || '').trim();
  return value || null;
}

function tokenizePrompt(prompt: string): string[] {
  return String(prompt || '')
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function scoreWeights(prompt: string, subjectTerms: string[]): { subjectWeight: number; styleWeight: number } {
  const lower = prompt.toLowerCase();
  const tokens = tokenizePrompt(prompt);

  let subjectWeight = 0;
  for (const term of subjectTerms) {
    if (lower.includes(term.toLowerCase())) {
      subjectWeight += 2;
    }
  }

  for (const token of tokens) {
    if (subjectTerms.some((term) => term.toLowerCase() === token)) {
      subjectWeight += 1;
    }
  }

  let styleWeight = 0;
  for (const styleTerm of STYLE_TERMS) {
    if (lower.includes(styleTerm)) {
      styleWeight += 2;
    }
  }

  return { subjectWeight, styleWeight };
}

async function loadSuite(cwd: string): Promise<PromptRegressionSuite> {
  const defaultPath = 'tests/image_scenarios/prompt_intent_regression_v1.json';
  const suitePath = path.resolve(cwd, getArgValue('--suite') || defaultPath);
  const raw = await readFile(suitePath, 'utf8');
  const suite = JSON.parse(raw) as PromptRegressionSuite;

  if (!suite.suiteId || !Array.isArray(suite.cases) || suite.cases.length === 0) {
    throw new Error(`Invalid suite: ${suitePath}`);
  }

  return suite;
}

function buildCaseReport(input: {
  testCase: PromptRegressionCase;
  checkpointId: string;
  explicitStyleFamily?: StyleFamilyId | null;
}): CaseReport {
  const { testCase, checkpointId, explicitStyleFamily } = input;
  const intent = parseIntent(testCase.prompt);
  const styleFamily = resolveStyleFamily(explicitStyleFamily, intent);
  const expanded = expandTags(intent);
  const blueprint = buildPhotogrammetryBlueprint(testCase.prompt);
  const promptResult = assemblePrompt(checkpointId, styleFamily, intent, expanded);
  const params = optimizeParameters(styleFamily, checkpointId, {
    userId: 'prompt-audit',
    sessionId: `suite-${testCase.id}`,
    prompt: testCase.prompt,
  });

  const { subjectWeight, styleWeight } = scoreWeights(testCase.prompt, testCase.subjectTerms);
  const dominanceBase = Math.max(1, subjectWeight + styleWeight);
  const subjectDominance = Number((subjectWeight / dominanceBase).toFixed(3));

  const lowerSubject = intent.subject.toLowerCase();
  const lowerSetting = intent.setting.toLowerCase();
  const subjectMatch = testCase.subjectTerms.some((term) => {
    const normalized = term.toLowerCase();
    return lowerSubject.includes(normalized) || lowerSetting.includes(normalized);
  });

  const hasHumanTokenInPositive = /\b(1girl|1boy|portrait|headshot|person|human)\b/i.test(promptResult.positive);
  const hasHumanSuppressionInNegative = /no extra people|human|people|characters/i.test(promptResult.negative);
  const portraitPriorTriggered = blueprint.captureMode === 'portrait' || intent.framing === 'portrait';

  const recommendations: string[] = [];
  if (!subjectMatch) {
    recommendations.push('Boost subject noun extraction for this prompt family in intent parser.');
  }
  if (subjectDominance < 0.5) {
    recommendations.push('Increase subject-token weighting relative to style adjectives.');
  }
  if (!testCase.allowPortrait && portraitPriorTriggered) {
    recommendations.push('Disable portrait capture defaults when environment nouns are present.');
  }
  if (!testCase.allowPortrait && hasHumanTokenInPositive) {
    recommendations.push('Remove human subject expansion tags from positive prompt for non-human scenes.');
  }

  const passed =
    subjectMatch &&
    subjectDominance >= 0.5 &&
    (testCase.allowPortrait || !portraitPriorTriggered) &&
    (testCase.allowPortrait || !hasHumanTokenInPositive);

  return {
    id: testCase.id,
    category: testCase.category,
    prompt: testCase.prompt,
    phase1: {
      parsedSubject: intent.subject,
      parsedSetting: intent.setting,
      parsedFraming: intent.framing,
      subjectWeight,
      styleWeight,
      subjectDominance,
      subjectMatch,
    },
    phase2: {
      styleFamily,
      captureMode: blueprint.captureMode,
      portraitPriorTriggered,
      expandedTagCount: expanded.tags.length,
    },
    phase3: {
      sampler: params.sampler,
      steps: params.steps,
      cfgScale: params.cfgScale,
      hasHumanTokenInPositive,
      hasHumanSuppressionInNegative,
    },
    phase4: {
      recommendations,
    },
    phase5: {
      passed,
    },
  };
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const suite = await loadSuite(cwd);
  const checkpointId = suite.defaults?.checkpointId || 'ion-citizen-xl-vpred-v2.0';
  const checkpoint = getCheckpointConfig(checkpointId);
  const explicitStyleFamily = suite.defaults?.explicitStyleFamily || null;

  const reports = suite.cases.map((testCase) =>
    buildCaseReport({
      testCase,
      checkpointId: checkpoint.id,
      explicitStyleFamily,
    }),
  );

  const failures = reports.filter((report) => !report.phase5.passed);
  const portraitLeakCount = reports.filter((report) => !suite.cases.find((c) => c.id === report.id)?.allowPortrait && report.phase2.portraitPriorTriggered).length;
  const humanLeakCount = reports.filter((report) => !suite.cases.find((c) => c.id === report.id)?.allowPortrait && report.phase3.hasHumanTokenInPositive).length;

  const summary = {
    suiteId: suite.suiteId,
    description: suite.description || '',
    checkpointId: checkpoint.id,
    totalCases: reports.length,
    passed: reports.length - failures.length,
    failed: failures.length,
    passRate: Number(((reports.length - failures.length) / Math.max(1, reports.length)).toFixed(3)),
    portraitPriorRate: Number((portraitLeakCount / Math.max(1, reports.length)).toFixed(3)),
    humanLeakRate: Number((humanLeakCount / Math.max(1, reports.length)).toFixed(3)),
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.resolve(cwd, getArgValue('--out') || path.join('data', 'logs'));
  await mkdir(outputDir, { recursive: true });

  const fullReport = {
    generatedAt: new Date().toISOString(),
    phase: {
      phase1: 'Prompt Parsing Audit',
      phase2: 'Model Input Validation',
      phase3: 'Render Pipeline Diagnostics',
      phase4: 'Corrective Actions',
      phase5: 'Validation and Regression Testing',
    },
    summary,
    failures: failures.map((report) => ({
      id: report.id,
      category: report.category,
      prompt: report.prompt,
      recommendations: report.phase4.recommendations,
    })),
    cases: reports,
  };

  const reportPath = path.join(outputDir, `prompt-intent-audit-${suite.suiteId}-${timestamp}.json`);
  const latestPath = path.join(outputDir, 'prompt-intent-audit.latest.json');

  await writeFile(reportPath, JSON.stringify(fullReport, null, 2), 'utf8');
  await writeFile(latestPath, JSON.stringify(fullReport, null, 2), 'utf8');

  if (hasFlag('--print-failures')) {
    for (const failure of failures.slice(0, 20)) {
      console.log(`[fail] ${failure.id}: ${failure.prompt}`);
    }
  }

  console.log(JSON.stringify({ ok: true, summary, reportPath: path.relative(cwd, reportPath).replace(/\\/g, '/'), latestPath: path.relative(cwd, latestPath).replace(/\\/g, '/') }, null, 2));
}

main().catch((error) => {
  console.error('[diagnose:prompt-intent] failed', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
