/**
 * @file solver.worker.ts
 * @description One-shot browser Worker adapter for the canonical solver protocol.
 * @remarks
 * A Worker instance accepts one `START_SEARCH` job. The controller owns
 * cancellation by terminating that instance; this adapter deliberately has no
 * cancel message or long-lived puzzle state. Every response echoes `requestId`
 * so the controller can discard stale progress or terminal messages.
 */

import {
  solveBfs,
  solveBidirectionalBfs,
  solveIdaStar,
  type SolverOptions,
  type WorkerInboundMessage,
  type WorkerOutboundMessage,
} from '@gearcube/solvers';

let hasExecuted = false;

function postOutboundMessage(msg: WorkerOutboundMessage): void {
  self.postMessage(msg);
}

self.onmessage = (event: MessageEvent<WorkerInboundMessage>): void => {
  const msg = event.data;

  if (msg.type !== 'START_SEARCH') {
    return;
  }

  const { requestId, algorithm, state, options } = msg;

  if (hasExecuted) {
    postOutboundMessage({
      type: 'SEARCH_ERROR',
      requestId,
      error: 'Worker instance has already executed a search job. Each search requires a new Worker instance.',
    });
    return;
  }

  hasExecuted = true;

  try {
    postOutboundMessage({
      type: 'SEARCH_STARTED',
      requestId,
    });

    const solverOptions: SolverOptions = {
      ...options,
      onProgress: (telemetry) => {
        postOutboundMessage({
          type: 'SEARCH_PROGRESS',
          requestId,
          telemetry,
        });
      },
    };

    let result;
    switch (algorithm) {
      case 'BFS':
        result = solveBfs(state, solverOptions);
        break;
      case 'BIDIRECTIONAL_BFS':
        result = solveBidirectionalBfs(state, solverOptions);
        break;
      case 'IDA_STAR':
        result = solveIdaStar(state, solverOptions);
        break;
      default: {
        const _exhaustiveCheck: never = algorithm;
        throw new Error(`Unsupported solver algorithm: ${String(_exhaustiveCheck)}`);
      }
    }

    if (result.status === 'SOLVED') {
      postOutboundMessage({
        type: 'SEARCH_COMPLETE',
        requestId,
        result,
      });
    } else if (result.status === 'LIMIT_REACHED') {
      postOutboundMessage({
        type: 'SEARCH_LIMIT_REACHED',
        requestId,
        result,
      });
    }
  } catch (error) {
    postOutboundMessage({
      type: 'SEARCH_ERROR',
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
