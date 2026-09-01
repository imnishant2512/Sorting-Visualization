import { useMemo, useState } from 'react';
import { useStepPlayer } from '../../../engine/useStepPlayer';
import { PlaybackControls } from '../../../shared/components/PlaybackControls';
import {
  ARRAY_SHAPES,
  ARRAY_SIZE,
  SPEED_MS,
  makeArray,
  type ArrayShape,
} from '../../../shared/utils/randomArray';
import { sortEngine } from '../engine';
import { MAX_SIZE_BY_ID, SORT_BY_ID } from '../registry';
import { SORT_STAT_KEYS } from '../types';
import { SortPanel } from './SortPanel';
import styles from './SortingPage.module.css';

export function SortingPage() {
  const [size, setSize] = useState<number>(ARRAY_SIZE.default);
  const [shape, setShape] = useState<ArrayShape>('random');
  const [baseArray, setBaseArray] = useState<number[]>(() => makeArray('random', ARRAY_SIZE.default));
  const [speedMs, setSpeedMs] = useState<number>(SPEED_MS.default);
  const [playing, setPlaying] = useState(false);
  const [raceMode, setRaceMode] = useState(false);
  const [idA, setIdA] = useState('quick');
  const [idB, setIdB] = useState('merge');

  // One input object shared by both players: in race mode each algorithm must
  // start from the identical array for the comparison to mean anything.
  const input = useMemo(() => ({ values: baseArray }), [baseArray]);
  const maxValue = useMemo(() => Math.max(1, ...baseArray), [baseArray]);

  const playerA = useStepPlayer({
    def: SORT_BY_ID[idA],
    input,
    engine: sortEngine,
    statKeys: SORT_STAT_KEYS,
    speedMs,
    playing,
  });

  const playerB = useStepPlayer({
    def: SORT_BY_ID[idB],
    input,
    engine: sortEngine,
    statKeys: SORT_STAT_KEYS,
    speedMs,
    playing: playing && raceMode,
  });

  const allFinished = !playerA.canStepForward && (!raceMode || !playerB.canStepForward);

  // Stop the shared clock only once every active player has finished, so the
  // faster algorithm showing "Done" doesn't freeze the slower one. Adjusted
  // during render rather than in an effect: it converges immediately and never
  // commits a frame that claims to be playing when nothing is left to play.
  if (playing && allFinished) setPlaying(false);

  // Bogo sort is the only algorithm with a hard size ceiling; picking it (in
  // either panel) clamps the array rather than freezing the tab.
  const sizeCap = Math.min(
    MAX_SIZE_BY_ID[idA] ?? ARRAY_SIZE.max,
    raceMode ? (MAX_SIZE_BY_ID[idB] ?? ARRAY_SIZE.max) : ARRAY_SIZE.max,
  );

  const regenerate = (shapeToUse: ArrayShape, sizeToUse: number, capToUse = sizeCap) => {
    setPlaying(false);
    const clamped = Math.min(sizeToUse, capToUse);
    setSize(clamped);
    setBaseArray(makeArray(shapeToUse, clamped));
  };

  /** Selecting an algorithm can tighten the size ceiling, so re-clamp here. */
  const selectAlgorithm = (panel: 'a' | 'b', id: string) => {
    setPlaying(false);
    if (panel === 'a') setIdA(id);
    else setIdB(id);

    const nextCap = Math.min(
      MAX_SIZE_BY_ID[panel === 'a' ? id : idA] ?? ARRAY_SIZE.max,
      raceMode ? (MAX_SIZE_BY_ID[panel === 'b' ? id : idB] ?? ARRAY_SIZE.max) : ARRAY_SIZE.max,
    );
    if (size > nextCap) regenerate(shape, nextCap, nextCap);
  };

  const handleToggle = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (allFinished) {
      playerA.reset();
      if (raceMode) playerB.reset();
    }
    setPlaying(true);
  };

  const handleStepForward = () => {
    setPlaying(false);
    playerA.next();
    if (raceMode) playerB.next();
  };

  const handleStepBack = () => {
    setPlaying(false);
    playerA.prev();
    if (raceMode) playerB.prev();
  };

  const handleRestart = () => {
    setPlaying(false);
    playerA.reset();
    playerB.reset();
  };

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <h1>Sorting</h1>
        <p>
          Seventeen sorting algorithms over one replayable engine. Step forward and back through
          every comparison and write, or race two algorithms against the same array.
        </p>
      </header>

      <div className={styles.setup}>
        <label>
          Size
          <input
            type="range"
            min={ARRAY_SIZE.min}
            max={sizeCap}
            value={size}
            onChange={(e) => {
              const next = Number(e.target.value);
              setSize(next);
              regenerate(shape, next);
            }}
          />
          <span className={styles.readout}>{size}</span>
        </label>

        <label>
          Shape
          <select
            value={shape}
            onChange={(e) => {
              const next = e.target.value as ArrayShape;
              setShape(next);
              regenerate(next, size);
            }}
          >
            {ARRAY_SHAPES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button onClick={() => regenerate(shape, size)}>New Array</button>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={raceMode}
            onChange={(e) => {
              setPlaying(false);
              setRaceMode(e.target.checked);
            }}
          />
          Race two algorithms
        </label>
      </div>

      <PlaybackControls
        isPlaying={playing}
        canStepBack={playerA.canStepBack || (raceMode && playerB.canStepBack)}
        canStepForward={playerA.canStepForward || (raceMode && playerB.canStepForward)}
        cursor={playerA.frame.cursor}
        totalSteps={playerA.totalSteps}
        speedMs={speedMs}
        onToggle={handleToggle}
        onStepBack={handleStepBack}
        onStepForward={handleStepForward}
        onReset={handleRestart}
        onSpeedChange={setSpeedMs}
        // Scrubbing two runs of different lengths to one cursor is meaningless.
        onSeek={
          raceMode
            ? undefined
            : (cursor) => {
                setPlaying(false);
                playerA.seekTo(cursor);
              }
        }
        resetLabel="Restart"
      />

      <div className={raceMode ? styles.race : styles.single}>
        <SortPanel
          def={SORT_BY_ID[idA]}
          frame={playerA.frame}
          currentStep={playerA.currentStep}
          maxValue={maxValue}
          onAlgorithmChange={(id) => selectAlgorithm('a', id)}
          compact={raceMode}
          finished={raceMode && !playerA.canStepForward}
        />

        {raceMode && (
          <SortPanel
            def={SORT_BY_ID[idB]}
            frame={playerB.frame}
            currentStep={playerB.currentStep}
            maxValue={maxValue}
            onAlgorithmChange={(id) => selectAlgorithm('b', id)}
            compact
            finished={!playerB.canStepForward}
          />
        )}
      </div>

      <footer className={styles.legend}>
        <Legend swatch="idle" label="Untouched" />
        <Legend swatch="compare" label="Comparing" />
        <Legend swatch="swap" label="Swapping" />
        <Legend swatch="write" label="Writing" />
        <Legend swatch="read" label="Reading" />
        <Legend swatch="bucket" label="Bucketing" />
        <Legend swatch="sorted" label="In final position" />
      </footer>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className={styles.legendItem}>
      <i className={styles.swatch} style={{ background: `var(--v-${swatch})` }} />
      {label}
    </span>
  );
}
