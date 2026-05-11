// src/image-gen/backend/gateway/workflow-validator.ts
// Comprehensive ComfyUI Workflow Validator
// Catches 400-error-causing issues before submission

import type { ComfyUIWorkflow } from '../../shared/types';

export interface WorkflowValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  nodeId?: string;
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: WorkflowValidationError[];
  warnings: WorkflowValidationError[];
}

/**
 * Comprehensive workflow validation
 * Detects issues that cause ComfyUI 400 errors
 */
export function validateComfyUIWorkflow(workflow: unknown): WorkflowValidationResult {
  const errors: WorkflowValidationError[] = [];
  const warnings: WorkflowValidationError[] = [];

  // =========================================================
  // BASIC TYPE VALIDATION
  // =========================================================

  if (!workflow || typeof workflow !== 'object') {
    return {
      valid: false,
      errors: [
        {
          field: 'root',
          message: 'Workflow must be a JSON object',
          severity: 'error',
        },
      ],
      warnings: [],
    };
  }

  if (Array.isArray(workflow)) {
    return {
      valid: false,
      errors: [
        {
          field: 'root',
          message: 'Workflow must be an object, not an array',
          severity: 'error',
        },
      ],
      warnings: [],
    };
  }

  const workflowObj = workflow as Record<string, unknown>;

  // =========================================================
  // STRUCTURE VALIDATION
  // =========================================================

  const nodeIds = Object.keys(workflowObj).filter((key) => key !== 'metadata');

  if (nodeIds.length === 0) {
    errors.push({
      field: 'nodes',
      message: 'Workflow must contain at least one node',
      severity: 'error',
    });
  }

  // =========================================================
  // PER-NODE VALIDATION
  // =========================================================

  let hasModelLoader = false;
  let hasSampler = false;
  let hasSaveImage = false;

  for (const nodeId of nodeIds) {
    const node = workflowObj[nodeId];

    // Node must be an object
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      errors.push({
        field: `nodes.${nodeId}`,
        message: `Node must be an object, got ${typeof node}`,
        severity: 'error',
        nodeId,
      });
      continue;
    }

    const nodeObj = node as Record<string, unknown>;
    const classType = String(nodeObj.class_type || '').trim();

    // Validate class_type
    if (!classType) {
      errors.push({
        field: `nodes.${nodeId}.class_type`,
        message: 'class_type is required',
        severity: 'error',
        nodeId,
      });
      continue;
    }

    // Validate inputs
    const inputs = nodeObj.inputs;
    if (inputs && typeof inputs !== 'object') {
      errors.push({
        field: `nodes.${nodeId}.inputs`,
        message: 'inputs must be an object',
        severity: 'error',
        nodeId,
      });
      continue;
    }

    // Validate input connections
    if (inputs && typeof inputs === 'object') {
      validateInputConnections(
        inputs as Record<string, unknown>,
        nodeId,
        nodeIds,
        errors,
      );
    }

    // Track required node types
    if (classType === 'CheckpointLoaderSimple') {
      hasModelLoader = true;
    } else if (classType === 'KSampler') {
      hasSampler = true;
      validateKSamplerInputs(nodeObj, nodeId, errors);
    } else if (classType === 'SaveImage') {
      hasSaveImage = true;
    }

    // Validate node-specific constraints
    validateNodeConstraints(classType, nodeObj, nodeId, errors);
  }

  // =========================================================
  // GRAPH STRUCTURE VALIDATION
  // =========================================================

  if (!hasModelLoader) {
    errors.push({
      field: 'graph',
      message: 'Workflow must include a CheckpointLoaderSimple node',
      severity: 'error',
    });
  }

  if (!hasSampler) {
    errors.push({
      field: 'graph',
      message: 'Workflow must include at least one KSampler node',
      severity: 'error',
    });
  }

  if (!hasSaveImage) {
    warnings.push({
      field: 'graph',
      message: 'Workflow should include a SaveImage node for output',
      severity: 'warning',
    });
  }

  // =========================================================
  // METADATA VALIDATION
  // =========================================================

  if (workflowObj.metadata && typeof workflowObj.metadata !== 'object') {
    warnings.push({
      field: 'metadata',
      message: 'metadata should be an object',
      severity: 'warning',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate input connections in a node
 */
function validateInputConnections(
  inputs: Record<string, unknown>,
  nodeId: string,
  validNodeIds: string[],
  errors: WorkflowValidationError[],
) {
  for (const [inputName, value] of Object.entries(inputs)) {
    if (value === null || value === undefined) {
      errors.push({
        field: `nodes.${nodeId}.inputs.${inputName}`,
        message: 'Input value cannot be null or undefined',
        severity: 'error',
        nodeId,
      });
      continue;
    }

    // String/number/boolean inputs are fine
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      continue;
    }

    // Arrays should be [nodeId, outputIndex]
    if (Array.isArray(value)) {
      if (value.length !== 2) {
        errors.push({
          field: `nodes.${nodeId}.inputs.${inputName}`,
          message: `Connection array must have 2 elements [nodeId, outputIndex], got ${value.length}`,
          severity: 'error',
          nodeId,
        });
        continue;
      }

      const [refNodeId, outputIndex] = value;
      const refNodeIdStr = String(refNodeId).trim();

      if (!refNodeIdStr) {
        errors.push({
          field: `nodes.${nodeId}.inputs.${inputName}`,
          message: 'Connection nodeId cannot be empty',
          severity: 'error',
          nodeId,
        });
        continue;
      }

      if (!validNodeIds.includes(refNodeIdStr)) {
        errors.push({
          field: `nodes.${nodeId}.inputs.${inputName}`,
          message: `Referenced node "${refNodeIdStr}" does not exist`,
          severity: 'error',
          nodeId,
        });
        continue;
      }

      if (!Number.isInteger(outputIndex) || outputIndex < 0) {
        errors.push({
          field: `nodes.${nodeId}.inputs.${inputName}`,
          message: `Output index must be a non-negative integer, got ${outputIndex}`,
          severity: 'error',
          nodeId,
        });
      }

      continue;
    }

    // Objects should be validated recursively (for complex inputs)
    if (typeof value === 'object') {
      // Allow objects but warn about them
      continue;
    }
  }
}

/**
 * Validate KSampler-specific requirements
 */
function validateKSamplerInputs(
  node: Record<string, unknown>,
  nodeId: string,
  errors: WorkflowValidationError[],
) {
  const inputs = node.inputs as Record<string, unknown> || {};
  const required = ['model', 'positive', 'negative', 'latent_image'];

  for (const requiredInput of required) {
    if (!(requiredInput in inputs)) {
      errors.push({
        field: `nodes.${nodeId}.inputs.${requiredInput}`,
        message: `KSampler requires input: ${requiredInput}`,
        severity: 'error',
        nodeId,
      });
    }
  }
}

/**
 * Validate node-specific constraints
 */
function validateNodeConstraints(
  classType: string,
  node: Record<string, unknown>,
  nodeId: string,
  errors: WorkflowValidationError[],
) {
  const inputs = node.inputs as Record<string, unknown> || {};

  switch (classType) {
    case 'CheckpointLoaderSimple': {
      const ckptName = String(inputs.ckpt_name ?? '').trim();
      if (!ckptName) {
        errors.push({
          field: `nodes.${nodeId}.inputs.ckpt_name`,
          message: 'CheckpointLoaderSimple requires a non-empty ckpt_name',
          severity: 'error',
          nodeId,
        });
      } else if (ckptName.includes('/') || ckptName.includes('\\')) {
        errors.push({
          field: `nodes.${nodeId}.inputs.ckpt_name`,
          message: 'ckpt_name must be a filename only, not a path',
          severity: 'error',
          nodeId,
        });
      }
      break;
    }


    case 'EmptyLatentImage': {
      const width = inputs.width;
      const height = inputs.height;

      if (typeof width !== 'number' || width <= 0) {
        errors.push({
          field: `nodes.${nodeId}.inputs.width`,
          message: 'width must be a positive number',
          severity: 'error',
          nodeId,
        });
      }

      if (typeof height !== 'number' || height <= 0) {
        errors.push({
          field: `nodes.${nodeId}.inputs.height`,
          message: 'height must be a positive number',
          severity: 'error',
          nodeId,
        });
      }

      // Check for valid dimensions
      if (typeof width === 'number' && typeof height === 'number') {
        if (width % 8 !== 0 || height % 8 !== 0) {
          errors.push({
            field: `nodes.${nodeId}.inputs`,
            message: 'Width and height must be multiples of 8',
            severity: 'error',
            nodeId,
          });
        }
      }
      break;
    }

    case 'CLIPTextEncode': {
      if (!('text' in inputs)) {
        errors.push({
          field: `nodes.${nodeId}.inputs.text`,
          message: 'CLIPTextEncode requires text input',
          severity: 'error',
          nodeId,
        });
      } else if (typeof inputs.text !== 'string') {
        errors.push({
          field: `nodes.${nodeId}.inputs.text`,
          message: 'CLIPTextEncode text must be a string',
          severity: 'error',
          nodeId,
        });
      }
      if (!('clip' in inputs)) {
        errors.push({
          field: `nodes.${nodeId}.inputs.clip`,
          message: 'CLIPTextEncode requires clip input',
          severity: 'error',
          nodeId,
        });
      }
      break;
    }

    case 'VAEDecode': {
      if (!('samples' in inputs)) {
        errors.push({
          field: `nodes.${nodeId}.inputs.samples`,
          message: 'VAEDecode requires samples input',
          severity: 'error',
          nodeId,
        });
      }
      if (!('vae' in inputs)) {
        errors.push({
          field: `nodes.${nodeId}.inputs.vae`,
          message: 'VAEDecode requires vae input',
          severity: 'error',
          nodeId,
        });
      }
      break;
    }
  }
}

/**
 * Format validation errors for logging
 */
export function formatValidationErrors(result: WorkflowValidationResult): string {
  const lines: string[] = [];

  if (result.errors.length > 0) {
    lines.push('❌ Validation Errors:');
    for (const error of result.errors) {
      const nodeInfo = error.nodeId ? ` [node: ${error.nodeId}]` : '';
      lines.push(`  - ${error.field}${nodeInfo}: ${error.message}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push('⚠️ Validation Warnings:');
    for (const warning of result.warnings) {
      const nodeInfo = warning.nodeId ? ` [node: ${warning.nodeId}]` : '';
      lines.push(`  - ${warning.field}${nodeInfo}: ${warning.message}`);
    }
  }

  return lines.join('\n');
}
