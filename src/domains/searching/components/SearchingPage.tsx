import { useEffect, useMemo, useState } from 'react';
import { useStepPlayer } from '../../../engine/useStepPlayer';
import { BarChart, type BarState } from '../../../shared/components/BarChart';
import { PlaybackControls } from '../../../shared/components/PlaybackControls';
import { PseudocodePanel } from '../../../shared/components/PseudocodePanel';
import { StatsPanel } from '../../../shared/components/StatsPanel';
import { ARRAY_SIZE, SPEED_MS, randomSortedArray } from '../../../shared/utils/randomArray';
import { SEARCH_ALGORITHMS, SEARCH_BY_ID } from '../algorithms';
import { searchEngine } from '../engine';
import { SEARCH_STAT_KEYS } from '../types';
import styles from './SearchingPage.module.css';

const STAT_LABELS = [
  { key: 'comparisons', label: 'Comparisons' },
  { key: 'accesses', label: 'Accesses' },
];

const DEFAULT_SIZE = 30;

export function SearchingPage() {
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [values, setValues] = useState<number[]>(() => randomSortedArray(DEFAULT_SIZE));
  const [algorithmId, setAlgorithmId] = useState('binary');
  const [target, setTarget] = useState<number>(() => 0);
  const [speedMs, setSpeedMs] = useState<number>(SPEED_MS.default * 3);
  const [playing, setPlaying] = useState(false);

  const def = SEARCH_BY_ID[algorithmId];

  // Pick a target that exists in the array on first render and whenever the
  // array is regenerated, so the default run actually finds something.
  useEffect(() => {
    setTarget(values[Math.floor(Math.random() * values.length)] ?? 0);
  }, [values]);

  const input = useMemo(() => ({ values, target }), [values, target]);
  const maxValue = useMemo(() => Math.max(1, ...values), [values]);

  const player = useStepPlayer({
    def,
    input,
    engine: searchEngine,
    statKeys: SEARCH_STAT_KEYS,
    speedMs,
    playing,
  });

  useEffect(() => {
    if (playing && !player.canStepForward) setPlaying(false);
  }, [playing, player.canStepForward]);

  const { state } = player.frame;
  const step = player.currentStep;
  const activeIndex =
    step && (step.kind === 'probe' || step.kind === 'compare') ? step.index : null;

  const stateFor = (index: number): BarState => {
    if (state.foundIndex === index) return 'found';
    if (index === activeIndex) return 'compare';
    if (index < state.lo || index > state.hi) return 'excluded';
    if (state.probed.includes(index)) return 'read';
    return 'idle';
  };

  const regenerate = (nextSize: number) => {
    setPlaying(false);
    setValues(randomSortedArray(nextSize));
  };

  const outcome = state.foundIndex !== null
    ? `Found ${target} at index ${state.foundIndex}`
    : state.exhausted
      ? `${target} is not in the array`
      : null;

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <h1>Searching</h1>
        <p>
          Five search strategies over the same sorted array. Watch the candidate window collapse —
          greyed bars have been ruled out without ever being read.
        </p>
      </header>

      <div className={styles.setup}>
        <label>
          Algorithm
          <select
            value={algorithmId}
            onChange={(e) => {
              setPlaying(false);
              setAlgorithmId(e.target.value);
            }}
          >
            {SEARCH_ALGORITHMS.map((algorithm) => (
              <option key={algorithm.id} value={algorithm.id}>
                {algorithm.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Target
          <input
            type="number"
            value={target}
            onChange={(e) => {
              setPlaying(false);
              setTarget(Number(e.target.value));
            }}
            className={styles.target}
          />
        </label>

        <label>
          Size
          <input
            type="range"
            min={ARRAY_SIZE.min}
            max={80}
            value={size}
            onChange={(e) => {
              const next = Number(e.target.value);
              setSize(next);
              regenerate(next);
            }}
          />
          <span className={styles.readout}>{size}</span>
        </label>

        <button onClick={() => regenerate(size)}>New Array</button>
      </div>

      <p className={styles.summary}>
        {def.summary}{' '}
        {def.requiresSorted && <em>Requires sorted input — this array is always ascending.</em>}
      </p>

      <PlaybackControls
        isPlaying={playing}
        canStepBack={player.canStepBack}
        canStepForward={player.canStepForward}
        cursor={player.frame.cursor}
        totalSteps={player.totalSteps}
        speedMs={speedMs}
        onToggle={() => {
          if (playing) {
            setPlaying(false);
            return;
          }
          if (!player.canStepForward) player.reset();
          setPlaying(true);
        }}
        onStepBack={() => {
          setPlaying(false);
          player.prev();
        }}
        onStepForward={() => {
          setPlaying(false);
          player.next();
        }}
        onReset={() => {
          setPlaying(false);
          player.reset();
        }}
        onSpeedChange={setSpeedMs}
        onSeek={(cursor) => {
          setPlaying(false);
          player.seekTo(cursor);
        }}
        resetLabel="Restart"
      />

      <div className={styles.chart}>
        <BarChart
          values={state.values}
          maxValue={maxValue}
          stateFor={stateFor}
          range={state.lo <= state.hi ? { lo: state.lo, hi: state.hi } : null}
          showValues
        />
      </div>

      {outcome && (
        <div className={state.foundIndex !== null ? styles.found : styles.missing}>{outcome}</div>
      )}

      <div className={styles.readouts}>
        <StatsPanel
          stats={player.frame.stats}
          labels={STAT_LABELS}
          complexity={def.complexity}
          note={state.note}
        />
        <PseudocodePanel lines={def.pseudocode} activeLine={player.frame.currentLine} />
      </div>
    </div>
  );
}
