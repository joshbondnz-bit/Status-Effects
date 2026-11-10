// Makes the saved data and a ticking clock available to every screen.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAppData } from './useAppData';
import type { AppData } from './storage';

interface AppDataContext {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
  error: string | null;
  /** The current time, refreshed every 15 seconds so countdowns move on their own. */
  now: number;
  /** Refresh `now` immediately (e.g. right after logging something). */
  tick: () => void;
}

const Ctx = createContext<AppDataContext | null>(null);

export function AppDataProvider({ children, loading }: { children: ReactNode; loading: ReactNode }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  const { data, error, update } = useAppData(now);
  if (!data) return <>{loading}</>;
  return <Ctx.Provider value={{ data, update, error, now, tick: () => setNow(Date.now()) }}>{children}</Ctx.Provider>;
}

export function useApp(): AppDataContext {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppDataProvider');
  return v;
}
