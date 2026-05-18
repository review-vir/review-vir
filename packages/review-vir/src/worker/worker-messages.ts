import type {PartialWithUndefined} from '@augment-vir/common';
import type {GitUpdatesStoppedReason} from '@review-vir/adapter-core';
import type {AtLeastOneDuration, FullDate} from 'date-vir';
import type {GitServiceName} from '../data/all-adapters.js';

export enum WorkerMessageType {
    SetupWorker = 'setup-worker',
    UpdateStarted = 'update-started',
    StartAutoUpdates = 'start-auto-updates',
    DataUpdated = 'data-updated',
    UpdatesStopped = 'updates-stopped',
}

export type WorkerMessage =
    | {
          type: WorkerMessageType.SetupWorker;
          serviceName: GitServiceName;
          secretEncryptionKey: string;
      }
    | {
          type: WorkerMessageType.StartAutoUpdates;
          updateInterval: AtLeastOneDuration;
      }
    | {
          type: WorkerMessageType.UpdateStarted;
      }
    | {
          type: WorkerMessageType.DataUpdated;
          error: string | undefined;
      }
    | ({
          type: WorkerMessageType.UpdatesStopped;
          message: string;
          reason: GitUpdatesStoppedReason;
      } & PartialWithUndefined<{
          resetAt: FullDate;
      }>);
