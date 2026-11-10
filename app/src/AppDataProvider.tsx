// Makes the saved data and a ticking clock available to every screen.
// In development builds the clock can be sped up or skipped ahead (the time machine).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAppData } from './useAppData';
import type { AppData } from './storage';

export interface TimeMachine {
  /** 1 = real time; 60 = a minute per second; 600 = ten minutes per second. */
  speed: number;
  setSpeed: (speed: number) => void;
  /** Jump forward by some milliseconds. */
  skip: (ms: number) => void;
  /** Back to the real clock. */
  reset: () => void;
  /** How far ahead of the real clock the app is, in ms. */
  offset: number;
}

interface AppDataContext {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  error: string | null;
  /** The app's current time, refreshed every 15 seconds (or faster when the time machine is running). */
  now: number;
  /** The exact current time right now (use this when logging something). */
  currentTime: () => number;
  /** Refresh `now` immediately (e.g. right after logging something). */
  tick: () => void;
  timeMachine: TimeMachine;
}

const Ctx = createContext<AppDataContext | null>(null);

export function AppDataProvider({ children, loading }: { children: ReactNode; loading: ReactNode }) {
  const offset = useRef(0);
  const [speed, setSpeed] = useState(1);
  const [offsetShown, setOffsetShown] = useState(0);
  const currentTime = useCallback(() => Date.now() + offset.current, []);
  const [now, setNow] = useState(() => Date.now());
  const tick = useCallback(() => { setNow(Date.now() + offset.current); setOffsetShown(offset.current); }, []);

  // Real time: refresh every 15 s. Sped up: refresh 4 times a second and move the clock forward faster.
  useEffect(() => {
    let last = Date.now();
    const id = setInterval(() => {
      const real = Date.now();
      offset.current += (speed - 1) * (real - last);
      last = real;
      tick();
    }, speed > 1 ? 250 : 15_000);
    return () => clearInterval(id);
  }, [speed, tick]);

  const timeMachine: TimeMachine = {
    speed,
    setSpeed,
    skip: ms => { offset.current += ms; tick(); },
    reset: () => { offset.current = 0; setSpeed(1); tick(); },
    offset: offsetShown,
  };

  const { data, error, update } = useAppData(now);
  if (!data) return <>{loading}</>;
  return <Ctx.Provider value={{ data, update, error, now, currentTime, tick, timeMachine }}>{children}</Ctx.Provider>;
}

export function useApp(): AppDataContext {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppDataProvider');
  return v;
}
