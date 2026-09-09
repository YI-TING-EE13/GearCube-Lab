import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  WorkerOutboundMessage,
} from '@gearcube/solvers';
import {
  acceptChallenge,
  beginChallenge,
  beginChallengeAttempt,
  cancelActiveChallenge,
  decideChallengeCertification,
  failActiveChallenge,
  INITIAL_CHALLENGE_GENERATION_STATE,
  recordChallengeCertificationDepth,
  type CertifiedChallenge,
  type ChallengeGenerationState,
} from '../components/challenge/challenge-controller.js';
import {
  createChallengeCandidate,
  type ChallengeDifficulty,
} from '../components/challenge/challenge.js';

export interface UseChallengeGeneratorResult {
  readonly state: ChallengeGenerationState;
  readonly startChallenge: (difficulty: ChallengeDifficulty, seed: string) => void;
  readonly cancelChallenge: () => void;
}

interface ActiveChallengeGeneration {
  readonly generationId: string;
  readonly difficulty: ChallengeDifficulty;
  readonly seed: string;
  candidate: ReturnType<typeof createChallengeCandidate>;
  worker: Worker | null;
  workerRequestId: string;
}

/**
 * Owns the certified-challenge worker lifecycle independently from visible
 * Solve. Each attempt gets a fresh one-shot IDA* Worker and stale/cancelled
 * results are rejected by both generation identity and worker request ID.
 */
export function useChallengeGenerator(
  onAccepted: (challenge: CertifiedChallenge) => void
): UseChallengeGeneratorResult {
  const [state, setState] = useState<ChallengeGenerationState>(
    INITIAL_CHALLENGE_GENERATION_STATE
  );
  const stateRef = useRef<ChallengeGenerationState>(INITIAL_CHALLENGE_GENERATION_STATE);
  const activeRef = useRef<ActiveChallengeGeneration | null>(null);
  const generationCounterRef = useRef(0);
  const isMountedRef = useRef(true);
  const onAcceptedRef = useRef(onAccepted);
  onAcceptedRef.current = onAccepted;

  const commitState = useCallback((nextState: ChallengeGenerationState): void => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const terminateWorker = useCallback((active: ActiveChallengeGeneration): void => {
    if (active.worker !== null) {
      active.worker.terminate();
      active.worker = null;
    }
  }, []);

  const failGeneration = useCallback(
    (active: ActiveChallengeGeneration, error: string): void => {
      if (!isMountedRef.current || activeRef.current !== active) {
        return;
      }
      terminateWorker(active);
      activeRef.current = null;
      commitState(failActiveChallenge(stateRef.current, active.generationId, error));
    },
    [commitState, terminateWorker]
  );

  const launchCandidate = useCallback(
    (active: ActiveChallengeGeneration): void => {
      if (!isMountedRef.current || activeRef.current !== active) {
        return;
      }

      const workerRequestId = `${active.generationId}:attempt:${active.candidate.attemptIndex}`;
      active.workerRequestId = workerRequestId;

      let worker: Worker;
      try {
        worker = new Worker(
          new URL('../workers/solver.worker.ts', import.meta.url),
          { type: 'module' }
        );
      } catch (error) {
        failGeneration(
          active,
          error instanceof Error ? error.message : String(error)
        );
        return;
      }

      active.worker = worker;
      worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>): void => {
        if (!isMountedRef.current || activeRef.current !== active) {
          return;
        }
        const message = event.data;
        if (message.requestId !== active.workerRequestId) {
          return;
        }

        if (message.type === 'SEARCH_COMPLETE') {
          const withDepth = recordChallengeCertificationDepth(
            stateRef.current,
            active.generationId,
            message.result.depth
          );
          commitState(withDepth);

          if (withDepth.status !== 'ACTIVE') {
            return;
          }

          const decision = decideChallengeCertification(
            withDepth,
            active.generationId,
            message.result.depth
          );

          if (decision.status === 'ACCEPT') {
            terminateWorker(active);
            activeRef.current = null;
            const acceptedState = acceptChallenge(withDepth, decision.result);
            commitState(acceptedState);
            onAcceptedRef.current(decision.result);
            return;
          }

          if (decision.status === 'RETRY') {
            terminateWorker(active);
            try {
              const nextCandidate = createChallengeCandidate(
                active.seed,
                active.difficulty,
                decision.nextAttemptIndex
              );
              active.candidate = nextCandidate;
              commitState(beginChallengeAttempt(withDepth, nextCandidate));
              launchCandidate(active);
            } catch (error) {
              failGeneration(
                active,
                error instanceof Error ? error.message : String(error)
              );
            }
            return;
          }

          if (decision.status === 'FAIL') {
            failGeneration(active, decision.error);
          }
          return;
        }

        if (message.type === 'SEARCH_LIMIT_REACHED') {
          failGeneration(
            active,
            `Challenge candidate search reached ${message.result.limit} before certification.`
          );
          return;
        }

        if (message.type === 'SEARCH_ERROR') {
          failGeneration(active, message.error);
        }
      };

      worker.onerror = (errorEvent: ErrorEvent): void => {
        if (!isMountedRef.current || activeRef.current !== active) {
          return;
        }
        failGeneration(
          active,
          errorEvent.message || 'Challenge Worker execution encountered an unhandled error'
        );
      };

      try {
        worker.postMessage({
          type: 'START_SEARCH',
          requestId: workerRequestId,
          algorithm: 'IDA_STAR',
          state: active.candidate.state,
        });
      } catch (error) {
        failGeneration(
          active,
          error instanceof Error ? error.message : String(error)
        );
      }
    },
    [commitState, failGeneration, terminateWorker]
  );

  const cancelChallenge = useCallback((): void => {
    const active = activeRef.current;
    if (active === null) {
      return;
    }
    terminateWorker(active);
    activeRef.current = null;
    commitState(cancelActiveChallenge(stateRef.current));
  }, [commitState, terminateWorker]);

  const startChallenge = useCallback(
    (difficulty: ChallengeDifficulty, seed: string): void => {
      const previous = activeRef.current;
      if (previous !== null) {
        terminateWorker(previous);
        activeRef.current = null;
      }

      generationCounterRef.current += 1;
      const generationId = `challenge-${generationCounterRef.current}`;

      try {
        const candidate = createChallengeCandidate(seed, difficulty, 0);
        const active: ActiveChallengeGeneration = {
          generationId,
          difficulty,
          seed,
          candidate,
          worker: null,
          workerRequestId: '',
        };
        activeRef.current = active;
        commitState(beginChallenge(stateRef.current, generationId, candidate));
        launchCandidate(active);
      } catch (error) {
        activeRef.current = null;
        commitState({
          status: 'ERROR',
          requestId: generationId,
          difficulty,
          seed,
          attemptIndex: 0,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [commitState, launchCandidate, terminateWorker]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      const active = activeRef.current;
      if (active !== null) {
        terminateWorker(active);
      }
      activeRef.current = null;
    };
  }, [terminateWorker]);

  return {
    state,
    startChallenge,
    cancelChallenge,
  };
}
