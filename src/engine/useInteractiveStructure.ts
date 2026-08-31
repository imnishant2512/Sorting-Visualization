import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { initFrame, seek, stepBack, stepForward } from './player';
import type { Frame, StepEngine } from './types';

/**
 * One user-triggered operation against a persistent structure — "Insert 7",
 * "Search 12". Read-only operations still animate and land in the history, but
 * they leave the structure untouched.
 */
export interface StructureOperation<TState, TStep, TArgs> {
  id: string;
  label(args: TArgs): string;
  pseudocode: string[];
  /** Pure: yields steps against the *current* structure. */
  generate(state: TState, args: TArgs): Generator<TStep>;
  /** Traversals and searches inspect without mutating. */
  readOnly?: boolean;
}

export interface OperationRecord<TState, TStep> {
  key: number;
  label: string;
  steps: TStep[];
  stateBefore: TState;
  stateAfter: TState;
  readOnly: boolean;
}

interface ActiveOperation<TState, TStep> {
  label: string;
  pseudocode: string[];
  steps: TStep[];
  stateBefore: TState;
  readOnly: boolean;
}

interface InteractiveState<TState, TStep> {
  /** Committed structure — what survives between operations. */
  structure: TState;
  history: OperationRecord<TState, TStep>[];
  /** Ephemeral, mid-flight operation. Not folded into `structure` until commit. */
  active: ActiveOperation<TState, TStep> | null;
  /** Cursor over the active operation (or a trivial frame over the structure). */
  frame: Frame<TState>;
  nextKey: number;
}

type Action<TState, TStep, TArgs> =
  | { type: 'perform'; operation: StructureOperation<TState, TStep, TArgs>; args: TArgs }
  | { type: 'forward' }
  | { type: 'back' }
  | { type: 'seek'; cursor: number }
  | { type: 'commit' }
  | { type: 'cancel' }
  | { type: 'undo' }
  | { type: 'reset'; structure: TState };

/**
 * Operation mode, built on the same cursor primitives as batch mode.
 *
 * Three actions that are easy to conflate are kept distinct here:
 *  - stepping back inside the active operation (scrubs the cursor),
 *  - cancelling the active operation (structure untouched),
 *  - undoing the last *committed* operation (restores its stateBefore).
 */
export function useInteractiveStructure<TState, TStep, TArgs>({
  engine,
  statKeys,
  initialState,
  speedMs,
  playing,
  onIdle,
}: {
  engine: StepEngine<TState, TStep>;
  statKeys: readonly string[];
  initialState: TState;
  speedMs: number;
  playing: boolean;
  /** Called when the active operation runs out of steps. */
  onIdle?: () => void;
}) {
  const reducer = useCallback(
    (
      state: InteractiveState<TState, TStep>,
      action: Action<TState, TStep, TArgs>,
    ): InteractiveState<TState, TStep> => {
      const commit = (s: InteractiveState<TState, TStep>): InteractiveState<TState, TStep> => {
        if (!s.active) return s;
        const { steps, stateBefore, readOnly, label } = s.active;
        const end =
          steps.length === 0
            ? initFrame(stateBefore, statKeys, 0)
            : seek(stateBefore, steps, engine, steps.length - 1, statKeys);
        // Read-only operations discard their visual marks on commit.
        const stateAfter = readOnly ? stateBefore : end.state;
        return {
          structure: stateAfter,
          history: [
            ...s.history,
            { key: s.nextKey, label, steps, stateBefore, stateAfter, readOnly },
          ],
          active: null,
          frame: initFrame(stateAfter, statKeys, 0),
          nextKey: s.nextKey + 1,
        };
      };

      switch (action.type) {
        case 'perform': {
          // Starting a new operation commits whatever was still in flight.
          const base = commit(state);
          const steps = [...action.operation.generate(base.structure, action.args)];
          return {
            ...base,
            active: {
              label: action.operation.label(action.args),
              pseudocode: action.operation.pseudocode,
              steps,
              stateBefore: base.structure,
              readOnly: action.operation.readOnly ?? false,
            },
            frame: initFrame(base.structure, statKeys, steps.length),
          };
        }

        case 'forward':
          if (!state.active) return state;
          return { ...state, frame: stepForward(state.frame, state.active.steps, engine) };

        case 'back':
          if (!state.active) return state;
          return { ...state, frame: stepBack(state.frame, state.active.steps, engine) };

        case 'seek': {
          if (!state.active) return state;
          const { steps, stateBefore } = state.active;
          return {
            ...state,
            frame:
              action.cursor < 0
                ? initFrame(stateBefore, statKeys, steps.length)
                : seek(stateBefore, steps, engine, action.cursor, statKeys),
          };
        }

        case 'commit':
          return commit(state);

        case 'cancel':
          if (!state.active) return state;
          return {
            ...state,
            active: null,
            frame: initFrame(state.structure, statKeys, 0),
          };

        case 'undo': {
          // An in-flight operation is discarded before any committed one.
          if (state.active) {
            return { ...state, active: null, frame: initFrame(state.structure, statKeys, 0) };
          }
          const last = state.history[state.history.length - 1];
          if (!last) return state;
          return {
            ...state,
            structure: last.stateBefore,
            history: state.history.slice(0, -1),
            frame: initFrame(last.stateBefore, statKeys, 0),
          };
        }

        case 'reset':
          return {
            structure: action.structure,
            history: [],
            active: null,
            frame: initFrame(action.structure, statKeys, 0),
            nextKey: 0,
          };

        default:
          return state;
      }
    },
    [engine, statKeys],
  );

  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    structure: initialState,
    history: [],
    active: null,
    frame: initFrame(initialState, statKeys, 0),
    nextKey: 0,
  }));

  const totalSteps = state.active?.steps.length ?? 0;
  const atEnd = state.frame.cursor >= totalSteps - 1;

  useEffect(() => {
    if (!playing || !state.active || atEnd) return;
    const id = window.setInterval(() => dispatch({ type: 'forward' }), speedMs);
    return () => window.clearInterval(id);
  }, [playing, atEnd, speedMs, state.active]);

  useEffect(() => {
    if (playing && (atEnd || !state.active)) onIdle?.();
  }, [playing, atEnd, state.active, onIdle]);

  const api = useMemo(
    () => ({
      perform: (operation: StructureOperation<TState, TStep, TArgs>, args: TArgs) =>
        dispatch({ type: 'perform', operation, args }),
      next: () => dispatch({ type: 'forward' }),
      prev: () => dispatch({ type: 'back' }),
      seekTo: (cursor: number) => dispatch({ type: 'seek', cursor }),
      commit: () => dispatch({ type: 'commit' }),
      cancel: () => dispatch({ type: 'cancel' }),
      undoLast: () => dispatch({ type: 'undo' }),
      reset: (structure: TState) => dispatch({ type: 'reset', structure }),
    }),
    [],
  );

  return {
    ...api,
    /** What to render: the mid-operation frame when one is active. */
    displayState: state.active ? state.frame.state : state.structure,
    structure: state.structure,
    history: state.history,
    active: state.active,
    frame: state.frame,
    currentStep:
      state.active && state.frame.cursor >= 0 ? state.active.steps[state.frame.cursor] : null,
    totalSteps,
    canStepForward: Boolean(state.active) && !atEnd,
    canStepBack: Boolean(state.active) && state.frame.cursor >= 0,
    canUndo: state.history.length > 0 || Boolean(state.active),
  };
}
