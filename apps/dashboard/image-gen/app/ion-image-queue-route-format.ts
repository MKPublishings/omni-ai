import type {
  IonImageQueueJobStatus,
  IonImageQueueMetadataRecord,
  IonImageQueueStatusResponse,
  IonImageQueueSubmissionResponse,
} from '../shared/types';

export function buildIonImageQueueSubmissionResponse(input: {
  jobId: string;
  requestId: string;
  status: IonImageQueueSubmissionResponse['status'];
}): IonImageQueueSubmissionResponse {
  return {
    queued: true,
    jobId: input.jobId,
    requestId: input.requestId,
    status: input.status,
    statusUrl: `/api/image?queue=v1&jobId=${encodeURIComponent(input.jobId)}`,
  };
}

function normalizeMetadataRecord(status: IonImageQueueJobStatus): IonImageQueueMetadataRecord | null {
  if (!status.metadata) {
    return null;
  }

  return status.metadata;
}

export function buildIonImageQueueStatusResponse(status: IonImageQueueJobStatus): IonImageQueueStatusResponse | null {
  if (!status.job) {
    return null;
  }

  return {
    jobId: status.job.jobId,
    requestId: status.job.requestId,
    promptId: status.job.promptId,
    status: status.job.status,
    createdAt: status.job.createdAt,
    updatedAt: status.job.updatedAt,
    attempts: status.job.attempts,
    maxAttempts: status.job.maxAttempts,
    artifacts: status.artifacts,
    metadata: normalizeMetadataRecord(status),
    response: status.job.response,
    error: status.job.error,
  };
}