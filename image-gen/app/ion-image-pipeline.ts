// ion-image-pipeline.ts
// Clean, conflict‑free, build‑safe version

// Types are not imported because they do not exist in '../shared/types'.

// ---------------------------------------------------------------------------
// 1. WORKFLOW BUILDER (stubbed but valid)
// ---------------------------------------------------------------------------

export function buildionWorkflow(config: {
  prompt: string
  sampler?: any
  scheduler?: any
  steps?: number
  seed?: number
  width?: number
  height?: number
  variationMode?: any
  composition?: any
  stylePack?: any
}) {
  return {
    ...config,
    workflowId: 'ion-v3-workflow',
  }
}

// ---------------------------------------------------------------------------
// 2. MOCK PIPELINE EXECUTION (stubbed but valid)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 0. TYPE DEFINITIONS (added for build safety)
// ---------------------------------------------------------------------------

export type IonImagePipelineResult = {
  ok: boolean
  workflowId: string
  images: Array<{
    url: string
    seed: number
  }>
  meta: {
    sampler: any
    scheduler: any
    steps: number
  }
}

async function executeWorkflow(
  workflow: ReturnType<typeof buildionWorkflow>
): Promise<IonImagePipelineResult> {
  return {
    ok: true,
    workflowId: workflow.workflowId,
    images: [
      {
        url: 'https://placehold.co/1024x1024/png',
        seed: workflow.seed ?? 12345,
      },
    ],
    meta: {
      sampler: workflow.sampler ?? 'euler',
      scheduler: workflow.scheduler ?? 'normal',
      steps: workflow.steps ?? 20,
    },
  }
}

// ---------------------------------------------------------------------------
// 3. PUBLIC API USED BY generate-ion-image-v3-route-result.ts
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 0.1. GENERATION REQUEST TYPE (added for build safety)
// ---------------------------------------------------------------------------

export type GenerationRequest = {
  prompt: string
  sampler?: any
  scheduler?: any
  steps?: number
  seed?: number
  width?: number
  height?: number
  variationMode?: any
  composition?: any
  stylePack?: any
}

export async function runIonImagePipeline(
  request: GenerationRequest
): Promise<IonImagePipelineResult> {
  const workflow = buildionWorkflow({
    prompt: request.prompt,
    sampler: request.sampler,
    scheduler: request.scheduler,
    steps: request.steps,
    seed: request.seed,
    width: request.width,
    height: request.height,
    variationMode: request.variationMode,
    composition: request.composition,
    stylePack: request.stylePack,
  })

  return executeWorkflow(workflow)
}
