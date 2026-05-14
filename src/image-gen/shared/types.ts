// src/image-gen/shared/types.ts

export namespace ImageGenTypes {
  export interface WorkflowConfig {
    name: string;
    prompt: string;
    aspectRatio?: string;
    [key: string]: any;
  }
}
