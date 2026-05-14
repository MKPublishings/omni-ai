import { validateOutput } from '@/safe.tensor/api/validateOutput.ts';
import { recordDecision } from '@/safe.tensor/api/recordDecision.ts';
import { bootstrapSafeTensorGovernance } from '../safe-tensor-bootstrap.ts';
import {
  callImageGenerator,
  type ImageGenOutput,
  type ImageGenRequest,
} from './imageGeneratorAdapter';
import { evaluateImageRules } from './imageRuleEngine';
import { normalizeVisualSceneSimState, toTensorSimState } from './simStateAdapter';

type EnvironmentSource = Record<string, unknown>;

export interface RouteImageJobDependencies {
  loadSimState?: (simStateRef: string) => Promise<Record<string, unknown>>;
  validate?: typeof validateOutput;
  callGenerator?: typeof callImageGenerator;
  record?: typeof recordDecision;
  enqueueApprovedImage?: (imageRef: string, job: ImageGenRequest) => Promise<void>;
}

export interface RouteImageJobResult {
  blocked: boolean;
  reasons: string[];
  imageRef?: string;
  output?: ImageGenOutput;
}

function parseDepartmentFromRef(simStateRef: string): string {
  const [department] = String(simStateRef || '').split(':');
  return department || 'media_generation';
}

async function defaultLoadSimState(simStateRef: string): Promise<Record<string, unknown>> {
  return {
    department: parseDepartmentFromRef(simStateRef),
    stage: 'render_generation',
    requiresCausalConsistency: true,
    canonLock: false,
    modality: 'image',
    intentValidationRequired: true,
    intentValidated: true,
  };
}

export async function routeImageJob(
  job: ImageGenRequest,
  source?: EnvironmentSource,
  deps?: RouteImageJobDependencies,
): Promise<RouteImageJobResult> {
  bootstrapSafeTensorGovernance();

  const loadSimState = deps?.loadSimState ?? defaultLoadSimState;
  const validate = deps?.validate ?? validateOutput;
  const callGenerator = deps?.callGenerator ?? callImageGenerator;
  const record = deps?.record ?? recordDecision;
  const loadedSimState = await loadSimState(job.simStateRef);
  const adaptedSimState = normalizeVisualSceneSimState(loadedSimState, parseDepartmentFromRef(job.simStateRef));
  const tensorSimState = toTensorSimState(adaptedSimState);

  const precheck = await validate({
    requestId: job.requestId,
    entityId: job.entityId,
    output: {
      type: 'intent',
      modality: 'image',
      prompt: job.prompt,
      styleHints: job.styleHints,
    },
    simState: tensorSimState,
    simStateRef: job.simStateRef,
  });

  if (precheck.decision !== 'allow') {
    await record({
      requestId: job.requestId,
      entityId: job.entityId,
      verdict: precheck,
      simStateRef: job.simStateRef,
      payload: {
        stage: 'precheck',
        prompt: job.prompt,
      },
    });

    return {
      blocked: true,
      reasons: precheck.reasons,
    };
  }

  const raw = await callGenerator(job, source);
  const imageRuleEvaluation = evaluateImageRules({
    job,
    output: raw,
    simState: adaptedSimState,
  });

  const verdict = await validate({
    requestId: job.requestId,
    entityId: job.entityId,
    output: {
      type: 'image',
      requestId: raw.requestId,
      entityId: raw.entityId,
      imageRef: raw.imageRef,
      latentMetadata: raw.latentMetadata,
      narrativeTags: imageRuleEvaluation.narrativeTags,
      physicsTags: imageRuleEvaluation.physicsTags,
      timelineIntegrity: imageRuleEvaluation.timelineIntegrity,
      canonConsistency: imageRuleEvaluation.canonConsistency,
      causalConsistency: imageRuleEvaluation.causalConsistency,
      geometryValid: imageRuleEvaluation.geometryValid,
      continuityScore: imageRuleEvaluation.continuityScore,
      roleConsistency: imageRuleEvaluation.roleConsistency,
      systemicImpactScore: imageRuleEvaluation.systemicImpactScore,
      departmentPackId: imageRuleEvaluation.departmentPackId,
      imageRuleViolations: imageRuleEvaluation.violations.map((violation) => violation.code),
      imageRuleReasons: imageRuleEvaluation.reasons,
    },
    simState: tensorSimState,
    simStateRef: job.simStateRef,
  });

  await record({
    requestId: job.requestId,
    entityId: job.entityId,
    verdict,
    simStateRef: job.simStateRef,
    payload: {
      stage: 'postcheck',
      imageRef: raw.imageRef,
      latentMetadata: raw.latentMetadata,
      narrativeTags: imageRuleEvaluation.narrativeTags,
      physicsTags: imageRuleEvaluation.physicsTags,
      imageRuleViolations: imageRuleEvaluation.violations,
      imageRuleReasons: imageRuleEvaluation.reasons,
      departmentPackId: imageRuleEvaluation.departmentPackId,
      scene: adaptedSimState.scene,
    },
  });

  if (verdict.decision !== 'allow') {
    const mergedReasons = Array.from(new Set<string>([
      ...imageRuleEvaluation.reasons,
      ...verdict.reasons,
    ]));

    return {
      blocked: true,
      reasons: mergedReasons,
    };
  }

  if (deps?.enqueueApprovedImage) {
    await deps.enqueueApprovedImage(raw.imageRef, job);
  }

  return {
    blocked: false,
    reasons: [],
    imageRef: raw.imageRef,
    output: raw,
  };
}
