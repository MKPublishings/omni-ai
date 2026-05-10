import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  buildIonImageGenerationRequest,
  executeIonImagePipelineRequest,
} from '../image-gen/app/ion-image-pipeline';
import type {
  ImageCompositionPreset,
  ImageVariationMode,
  KimonoStyleProfileId,
} from '../image-gen/shared/types';

interface ScenarioDefaults {
  stylePack?: string;
  variationMode?: ImageVariationMode;
  anatomyStrictMode?: boolean;
  styleProfile?: KimonoStyleProfileId;
  compositionPreset?: ImageCompositionPreset;
  width?: number;
  height?: number;
}

interface ImageScenario {
  id: string;
  prompt: string;
  stylePack?: string;
  variationMode?: ImageVariationMode;
  anatomyStrictMode?: boolean;
  styleProfile?: KimonoStyleProfileId;
  compositionPreset?: ImageCompositionPreset;
  width?: number;
  height?: number;
  seed?: number;
}

interface ScenarioSuite {
  suiteId: string;
  description?: string;
  defaults?: ScenarioDefaults;
  scenarios: ImageScenario[];
}

interface ScenarioSummary {
  id: string;
  prompt: string;
  outputMetadataPath: string;
  outputImagePath?: string;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function getArgValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index < 0 || index + 1 >= process.argv.length) {
    return null;
  }
  return String(process.argv[index + 1] || '').trim() || null;
}

function toSlug(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function loadSuite(filePath: string): Promise<ScenarioSuite> {
  const raw = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw) as ScenarioSuite;

  if (!parsed.suiteId || !Array.isArray(parsed.scenarios) || parsed.scenarios.length === 0) {
    throw new Error(`Invalid scenario suite in ${filePath}`);
  }

  return parsed;
}

function applyDefaults(defaults: ScenarioDefaults | undefined, scenario: ImageScenario): ImageScenario {
  return {
    ...defaults,
    ...scenario,
  };
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const suitePath = path.resolve(
    cwd,
    getArgValue('--suite') || 'tests/image_scenarios/kimono_spring_v1.json',
  );
  const render = hasFlag('--render');
  const outputRootArg = getArgValue('--out');
  const now = new Date();
  const runId = now.toISOString().replace(/[:.]/g, '-');

  const suite = await loadSuite(suitePath);
  const outputRoot = path.resolve(
    cwd,
    outputRootArg || path.join('gallery', suite.suiteId, runId),
  );

  await mkdir(outputRoot, { recursive: true });

  const summaries: ScenarioSummary[] = [];

  for (let index = 0; index < suite.scenarios.length; index += 1) {
    const merged = applyDefaults(suite.defaults, suite.scenarios[index]);
    const scenarioId = toSlug(merged.id || `scenario_${index + 1}`);
    const seed = Number.isFinite(merged.seed) ? Number(merged.seed) : index + 1;

    const request = await buildIonImageGenerationRequest({
      userId: `suite-${suite.suiteId}`,
      prompt: merged.prompt,
      stylePack: merged.stylePack,
      width: merged.width,
      height: merged.height,
      seed,
      variationMode: merged.variationMode,
      anatomyStrictMode: merged.anatomyStrictMode,
      styleProfile: merged.styleProfile,
      compositionPreset: merged.compositionPreset,
    }, process.env as Record<string, unknown>);

    const scenarioOutDir = path.join(outputRoot, scenarioId);
    await mkdir(scenarioOutDir, { recursive: true });

    const metadataPath = path.join(scenarioOutDir, 'metadata.json');
    const ratingTemplatePath = path.join(scenarioOutDir, 'ratings.json');

    await writeFile(metadataPath, JSON.stringify({
      suiteId: suite.suiteId,
      scenarioId,
      generatedAt: now.toISOString(),
      promptConfig: merged,
      request,
    }, null, 2), 'utf8');

    await writeFile(ratingTemplatePath, JSON.stringify({
      suiteId: suite.suiteId,
      scenarioId,
      criteria: {
        hands: null,
        shoulders_neck: null,
        kimono_wrap_correctness: null,
      },
      notes: '',
      scale: '0-2',
    }, null, 2), 'utf8');

    let outputImagePath: string | undefined;

    if (render) {
      const result = await executeIonImagePipelineRequest(request, process.env as Record<string, unknown>);
      outputImagePath = path.join(scenarioOutDir, 'render.png');
      await writeFile(outputImagePath, Buffer.from(result.imageBytes));
    }

    summaries.push({
      id: scenarioId,
      prompt: merged.prompt,
      outputMetadataPath: path.relative(cwd, metadataPath).replace(/\\/g, '/'),
      outputImagePath: outputImagePath ? path.relative(cwd, outputImagePath).replace(/\\/g, '/') : undefined,
    });
  }

  const indexPath = path.join(outputRoot, 'index.json');
  await writeFile(indexPath, JSON.stringify({
    suiteId: suite.suiteId,
    description: suite.description || '',
    generatedAt: now.toISOString(),
    render,
    scenarioCount: summaries.length,
    scenarios: summaries,
  }, null, 2), 'utf8');

  console.log(JSON.stringify({
    ok: true,
    suiteId: suite.suiteId,
    render,
    outputRoot: path.relative(cwd, outputRoot).replace(/\\/g, '/'),
    indexPath: path.relative(cwd, indexPath).replace(/\\/g, '/'),
    scenarioCount: summaries.length,
  }, null, 2));
}

main().catch((error) => {
  console.error('[test:images] failed', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
