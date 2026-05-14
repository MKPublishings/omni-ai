import type {
  IonImagePipelineInput,
} from './ion-image-pipeline';
import {
  getIonImageJobStatus,
  runNextQueuedIonImageJob,
  submitIonImageJob,
} from './ion-image-queue-runtime';
import {
  buildIonImageQueueStatusResponse,
  buildIonImageQueueSubmissionResponse,
} from './ion-image-queue-route-format';
import type {
  IonImageQueueRouteErrorResponse,
  IonImageQueueRouteResult,
  IonImageQueueStatusResponse,
  IonImageQueueSubmissionResponse,
} from '../shared/types';

type EnvironmentSource = Record<string, unknown>;

export async function getIonImageQueueStatusRouteResult(
  jobId: string,
  source?: EnvironmentSource,
): Promise<IonImageQueueRouteResult<IonImageQueueStatusResponse | IonImageQueueRouteErrorResponse>> {
  if (!jobId) {
    return {
      status: 400,
      body: {
        error: 'jobId is required',
        code: 'missing-job-id',
      },
    };
  }

  const status = await getIonImageJobStatus(jobId, source);
  if (!status.job) {
    return {
      status: 404,
      body: {
        error: 'Image job not found',
        code: 'image-job-not-found',
      },
    };
  }

  const body = buildIonImageQueueStatusResponse(status);
  if (!body) {
    throw new Error('Image queue status formatter returned null for an existing job.');
  }

  return {
    status: 200,
    body,
  };
}

export async function submitIonImageQueueRouteResult(
  input: IonImagePipelineInput,
  source?: EnvironmentSource,
): Promise<{
  response: IonImageQueueRouteResult<IonImageQueueSubmissionResponse>;
  backgroundTask: Promise<unknown>;
}> {
  const queuedJob = await submitIonImageJob(input, source);

  return {
    response: {
      status: 202,
      body: buildIonImageQueueSubmissionResponse({
        jobId: queuedJob.jobId,
        requestId: queuedJob.requestId,
        status: queuedJob.status,
      }),
    },
    backgroundTask: runNextQueuedIonImageJob(source),
  };
}