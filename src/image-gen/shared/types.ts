export const IMAGE_GENERATION_PRIORITIES = ['interactive', 'batch', 'retry'] as const;
export type ImageGenerationPriority = (typeof IMAGE_GENERATION_PRIORITIES)[number];

export const IMAGE_JOB_STATUSES = ['queued', 'processing', 'post-processing', 'completed', 'failed'] as const;
export type ImageJobStatus = (typeof IMAGE_JOB_STATUSES)[number];

export const IMAGE_SAMPLERS = ['euler', 'ddim'] as const;
export type ImageSampler = (typeof IMAGE_SAMPLERS)[number];

export const IMAGE_SCHEDULERS = ['normal', 'karras'] as const;
export type ImageScheduler = (typeof IMAGE_SCHEDULERS)[number];

export const IMAGE_OUTPUT_FORMATS = ['png', 'webp', 'jpeg'] as const;
export type ImageOutputFormat = (typeof IMAGE_OUTPUT_FORMATS)[number];

export const IMAGE_PREDICTION_TYPES = ['v_prediction', 'epsilon'] as const;
export type ImagePredictionType = (typeof IMAGE_PREDICTION_TYPES)[number];

export const STYLE_FAMILY_IDS = [
  'cinematic_niji',
  'soft_pastel_shoujo',
  'gritty_seinen',
  'retro_90s_cel',
  'semi_realistic_2_5d',
  'painterly_watercolor',
  'lofi_aesthetic',
] as const;
export type StyleFamilyId = (typeof STYLE_FAMILY_IDS)[number];

export const REASONING_STEP_IDS = [
  'intent_parse',
  'profile_check',
  'style_infer',
  'tag_expand',
  'character_resolve',
  'composition_plan',
  'quality_inject',
  'negative_assemble',
  'param_optimize',
  'safety_gate',
  'workflow_build',
  'submit',
] as const;
export type ReasoningStepId = (typeof REASONING_STEP_IDS)[number];

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface UserInput {
  userId: string;
  sessionId: string;
  prompt: string;
  styleFamily?: StyleFamilyId | null;
  checkpoint?: string | null;
  loras?: LoraConfig[];
  priority?: ImageGenerationPriority;
  parameterOverrides?: Partial<GenerationParameters>;
}

export interface ParsedIntent {
  subject: string;
  action: string;
  mood: string;
  setting: string;
  framing: string;
  timeOfDay: string;
  rawPrompt: string;
}

export interface TagExpansionResult {
  tags: string[];
  inferredMood: string;
  framing: string;
}

export interface PromptAssemblyResult {
  positive: string;
  negative: string;
  qualityTags: string[];
  styleTags: string[];
}

export interface SafetyDecision {
  allowed: boolean;
  reason?: string;
  blockedTerm?: string;
}

export interface LoraConfig {
  name: string;
  weight: number;
}

export interface StylePreset {
  id: StyleFamilyId;
  name: string;
  description: string;
  exampleThumbnail: string;
  positivePrefix: string;
  negativeAdditions: string;
  sampler: ImageSampler;
  steps: number;
  cfgScale: number;
  defaultResolution: {
    width: number;
    height: number;
  };
  checkpointOverride?: string;
  loraStack?: LoraConfig[];
}

export interface CheckpointConfig {
  id: string;
  displayName: string;
  baseModelFamily: string;
  predictionType: ImagePredictionType;
  vae: string;
  qualityTags: string[];
  sourceTag?: string;
  recommendedSampler: ImageSampler;
  recommendedScheduler: ImageScheduler;
  recommendedCfgScale: number;
  recommendedCfgRescale?: number;
  recommendedSteps: number;
  clipSkip: number;
  defaultResolution: {
    width: number;
    height: number;
  };
}

export interface GenerationPrompt {
  positive: string;
  negative: string;
  qualityTags: string[];
  styleTags: string[];
}

export interface GenerationModelConfig {
  checkpoint: string;
  predictionType: ImagePredictionType;
  vae: string;
  loras: LoraConfig[];
  clipSkip: number;
}

export interface GenerationParameters {
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  cfgRescale: number;
  sampler: ImageSampler;
  scheduler: ImageScheduler;
  seed: number;
  batchSize: number;
}

export interface GenerationPostProcessing {
  upscale: {
    enabled: boolean;
    model: string;
    scale: number;
  };
  format: ImageOutputFormat;
  quality: number;
  embedMetadata: boolean;
  generateThumbnail: boolean;
}

export interface IonGenerationMetadata {
  reasoningChain: ReasoningStepId[];
  originalUserPrompt: string;
  styleFamily: StyleFamilyId;
  inferredMood: string;
  confidence: number;
}

export type InferenceSource = 'prompt' | 'session-or-request' | 'auto' | 'none';

export interface IonImageV2Metadata {
  pipeline: {
    version: 'v2';
    gateway: 'mock' | 'comfyui';
    requestId: string;
    promptId: string;
    reasoningChain: ReasoningStepId[];
  };
  request: {
    mode: string;
    quality: string;
    originalPrompt: string;
    styleFamily: StyleFamilyId;
    styleSource: Exclude<InferenceSource, 'prompt' | 'none'>;
    inferredMood: string;
    confidence: number;
    feedbackApplied: boolean;
  };
  image: {
    filename: string;
    mimeType: string;
    width: number;
    height: number;
    ratio: string;
    resolution: string;
    format: ImageOutputFormat;
    exportLocation: 'chat-download';
  };
  model: {
    checkpoint: string;
    outputModel: string;
    predictionType: ImagePredictionType;
    vae: string;
    clipSkip: number;
    sampler: ImageSampler;
    scheduler: ImageScheduler;
    steps: number;
    cfgScale: number;
    cfgRescale: number;
    seed: number;
    batchSize: number;
  };
  prompt: GenerationPrompt;
  postProcessing: IonImagePostProcessingSummary;
  promptAnalytics: IonImagePromptAnalytics;
  scene: {
    camera: {
      value: string;
      source: Exclude<InferenceSource, 'auto'>;
    };
    lighting: {
      value: string;
      source: Exclude<InferenceSource, 'auto'>;
    };
    materials: {
      values: string[];
      source: Exclude<InferenceSource, 'auto'>;
    };
  };
  safety: {
    ageTier: 'adult' | 'minor';
    explicitAllowed: boolean;
    illegalBlocked: boolean;
  };
}

export interface IonImageV2RouteDebug {
  requested: IonImageV2RouteRequestedDebug;
  v2_pipeline: {
    checkpoint: string;
    promptId: string;
    workflowMetadata: JsonValue | undefined;
    reasoningChain: ReasoningStepId[];
    gateway: 'mock' | 'comfyui';
    requestId: string;
  };
}

export interface IonImageV2RouteRequestedDebug {
  mode: string;
  stylePack: string;
  inferredStyleFromPrompt: string | null;
  effectiveStylePack: string | null;
  quality: string;
  renderingStyle: StyleFamilyId;
  inferredCameraFromPrompt: string | null;
  effectiveCamera: string;
  inferredLightingFromPrompt: string | null;
  effectiveLighting: string;
  inferredMaterialsFromPrompt: string[];
  effectiveMaterials: string[];
  availableStyles: string[];
  ratio: string;
  resolution: string | null;
  width: number | null;
  height: number | null;
  seed: number | null;
}

export interface IonImagePipelineResult {
  request: GenerationRequest;
  workflow: ComfyUIWorkflow;
  promptId: string;
  imageBytes: Uint8Array;
  outputModel: string;
  gatewayKind: 'mock' | 'comfyui';
}

export interface IonImageV2RouteResponse {
  user_id: string;
  imageDataUrl: string;
  filename: string;
  metadata: IonImageV2Metadata;
  debug?: IonImageV2RouteDebug;
}

export interface GenerationRequest {
  requestId: string;
  userId: string;
  sessionId: string;
  priority: ImageGenerationPriority;
  timestamp: string;
  prompt: GenerationPrompt;
  model: GenerationModelConfig;
  parameters: GenerationParameters;
  postProcessing: GenerationPostProcessing;
  ionMetadata: IonGenerationMetadata;
}

export interface GeneratedImageRecord {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  format: ImageOutputFormat;
  sizeBytes: number;
  seed: number;
}

export interface GenerationTiming {
  queueMs: number;
  modelLoadMs: number;
  inferenceMs: number;
  postProcessingMs: number;
  totalMs: number;
}

export interface GenerationResponse {
  requestId: string;
  status: 'completed' | 'failed' | 'partial';
  images: GeneratedImageRecord[];
  timing: GenerationTiming;
  modelInfo: {
    checkpoint: string;
    predictionType: ImagePredictionType;
    lorasApplied: string[];
    actualSteps: number;
    actualCfg: number;
    vae: string;
  };
  error: ImageGenerationError | null;
}

export interface ImageQueueJobRecord {
  jobId: string;
  requestId: string;
  promptId: string | null;
  status: ImageJobStatus;
  priority: ImageGenerationPriority;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  maxAttempts: number;
  request: GenerationRequest;
  response: GenerationResponse | null;
  error: ImageGenerationError | null;
}

export interface StoredImageArtifact {
  artifactId: string;
  jobId: string;
  kind: 'image' | 'thumbnail';
  path: string;
  mimeType: string;
  format: ImageOutputFormat;
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: string;
}

export interface StoredMetadataRecord<TPayload = JsonValue> {
  jobId: string;
  path: string;
  createdAt: string;
  payload: TPayload;
}

export interface IonImageQueueMetadataPayloadArtifact {
  artifactId: string;
  kind: StoredImageArtifact['kind'];
  path: string;
  format: ImageOutputFormat;
}

export interface IonImagePostProcessingSummary {
  outputFormat: ImageOutputFormat;
  quality: number;
  metadataEmbedded: boolean;
  thumbnailGenerated: boolean;
  upscaleRequested: boolean;
}

export interface IonImagePromptAnalytics {
  originalPromptLength: number;
  positivePromptLength: number;
  negativePromptLength: number;
  qualityTagCount: number;
  styleTagCount: number;
}

export interface IonImageGenerationLog {
  event: 'ion.image.job.completed' | 'ion.image.job.failed';
  requestId: string;
  jobId: string;
  promptId: string | null;
  status: 'completed' | 'failed';
  gateway: 'mock' | 'comfyui' | null;
  checkpoint: string;
  styleFamily: StyleFamilyId;
  artifactCount: number;
  postProcessingMs: number;
  totalMs: number;
  errorCode: string | null;
  promptAnalytics: IonImagePromptAnalytics;
}

export interface IonImageQueueMetadataPayload {
  requestId: string;
  jobId: string;
  promptId: string;
  gateway: 'mock' | 'comfyui';
  checkpoint: string;
  styleFamily: StyleFamilyId;
  reasoningChain: ReasoningStepId[];
  postProcessing: IonImagePostProcessingSummary;
  promptAnalytics: IonImagePromptAnalytics;
  artifacts: IonImageQueueMetadataPayloadArtifact[];
}

export type IonImageQueueMetadataRecord = StoredMetadataRecord<IonImageQueueMetadataPayload>;

export interface IonImageQueueJobStatus {
  job: ImageQueueJobRecord | null;
  artifacts: StoredImageArtifact[];
  metadata: IonImageQueueMetadataRecord | null;
}

export interface IonImageQueueSubmissionResponse {
  queued: true;
  jobId: string;
  requestId: string;
  status: ImageJobStatus;
  statusUrl: string;
}

export type IonImageQueueRouteErrorCode = 'missing-job-id' | 'image-job-not-found';

export interface IonImageQueueRouteErrorResponse {
  error: string;
  code: IonImageQueueRouteErrorCode;
}

export interface IonImageQueueStatusResponse {
  jobId: string;
  requestId: string;
  promptId: string | null;
  status: ImageJobStatus;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  maxAttempts: number;
  artifacts: StoredImageArtifact[];
  metadata: IonImageQueueMetadataRecord | null;
  response: GenerationResponse | null;
  error: ImageGenerationError | null;
}

export interface IonImageQueueRouteResult<TBody> {
  status: number;
  body: TBody;
}

export interface ImageGenerationError {
  code: string;
  message: string;
  retriable: boolean;
  suggestedAction: string;
}

export interface ProgressEvent {
  promptId: string;
  status: ImageJobStatus;
  step: number;
  totalSteps: number;
  queuePosition?: number;
  previewImageUrl?: string;
}

export interface JobStatus {
  promptId: string;
  status: ImageJobStatus;
  queuePosition: number;
  step: number;
  totalSteps: number;
}

export type ComfyUIWorkflow = Record<string, JsonValue>;

export interface IModelGateway {
  submitWorkflow(workflow: ComfyUIWorkflow): Promise<{ promptId: string }>;
  getJobStatus(promptId: string): Promise<JobStatus>;
  getOutputImage(promptId: string): Promise<Uint8Array>;
  getProgress(promptId: string): AsyncIterable<ProgressEvent>;
  getLoadedModel(): Promise<string | null>;
  isHealthy(): Promise<boolean>;
}

export interface IImageJobQueue {
  enqueue(request: GenerationRequest, options?: { maxAttempts?: number }): Promise<ImageQueueJobRecord>;
  dequeueNext(): Promise<ImageQueueJobRecord | null>;
  getJob(jobId: string): Promise<ImageQueueJobRecord | null>;
  listJobs(status?: ImageJobStatus): Promise<ImageQueueJobRecord[]>;
  markProcessing(jobId: string, promptId?: string | null): Promise<ImageQueueJobRecord>;
  markCompleted(jobId: string, response: GenerationResponse): Promise<ImageQueueJobRecord>;
  markFailed(jobId: string, error: ImageGenerationError): Promise<ImageQueueJobRecord>;
}

export interface IImageArtifactStorage {
  putImage(input: {
    jobId: string;
    kind: 'image' | 'thumbnail';
    bytes: Uint8Array;
    mimeType: string;
    format: ImageOutputFormat;
    width: number;
    height: number;
  }): Promise<StoredImageArtifact>;
  getImages(jobId: string): Promise<StoredImageArtifact[]>;
  getImageBytes(artifactId: string): Promise<Uint8Array | null>;
  putMetadata<TPayload>(jobId: string, payload: TPayload): Promise<StoredMetadataRecord<TPayload>>;
  getMetadata<TPayload = JsonValue>(jobId: string): Promise<StoredMetadataRecord<TPayload> | null>;
}

export interface IOrchestrator {
  processRequest(userInput: UserInput): Promise<GenerationRequest>;
  getReasoningChain(requestId: string): Promise<ReasoningStepId[]>;
}