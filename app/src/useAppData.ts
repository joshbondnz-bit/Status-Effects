import { useCallback, useEffect, useRef, useState } from 'react';
import { nightIsOver } from '../../engine/src/index.ts';
import { loadData, newNight, saveData, type AppData } from './storage';

/** If tonight's log is finished, move it into `past` and start a fresh night. */
function rollOver(d: AppData, now: number): AppData {
  if (!nightIsOver(d.profile, d.tonight.events, now)) return d;
  const hasDrinks = d.tonight.events.some(e => e.type === 'drink');
  return { ...d, past: hasDrinks ? [...d.past, d.tonight] : d.past, tonight: newNight() };
}

/**
 * The app's saved data. `ready` is false until it has loaded from the device.
 * `update` changes the data and saves it straight away.
 */
export function useAppData(now: number) {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef<AppData | null>(null);

  useEffect(() => {
    let alive = true;
    loadData()
      .then(d => { if (alive) { const r = rollOver(d, Date.now()); latest.current = r; setData(r); if (r !== d) saveData(r); } })
      .catch(() => { if (alive) setError("Couldn't read your saved data on this device."); });
    return () => { alive = false; };
  }, []);

  const update = useCallback((fn: (d: AppData) => AppData) => {
    const cur = latest.current;
    if (!cur) return;
    const next = fn(cur);
    latest.current = next;
    setData(next);
    saveData(next).catch(() => setError("Couldn't save. Your last change may not be kept."));
  }, []);

  // As the clock moves on (e.g. the app stayed open overnight), file away a finished night.
  useEffect(() => {
    if (latest.current && nightIsOver(latest.current.profile, latest.current.tonight.events, now)) update(d => rollOver(d, now));
  }, [now, update]);

  return { data, ready: data !== null, error, update };
}
