// src/image-gen/shared/types.ts

export namespace ImageGenTypes {
  // Workflow configuration
  export interface WorkflowConfig {
    name: string;
    prompt: string;
    aspectRatio?: string;
    [key: string]: any;
  }

  // Valid samplers used in route.ts
  export type ImageSampler =
    | 'ddim'
    | 'euler'
    | 'euler-ancestral'
    | 'heun'
    | 'lms'
    | 'dpm2'
    | 'dpm2-ancestral'
    | 'dpMPP2MSampler'
    | 'dpMPP2MSampler2'
    | 'ddpm';

  // Valid schedulers used in route.ts
  export type ImageScheduler =
    | 'normal'
    | 'karras';
}
