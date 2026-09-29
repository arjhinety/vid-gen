/**
 * Async resources (syntax highlighters, equation typesetters, fonts, images) register
 * here. The render host waits for everything pending before it captures a frame, so
 * asynchronous loading can never produce a half-rendered frame.
 */
import { useEffect, useState } from "react";

const pending = new Set<Promise<unknown>>();

export function trackPending<T>(p: Promise<T>): Promise<T> {
  pending.add(p);
  p.finally(() => pending.delete(p)).catch(() => {});
  return p;
}

/** Resolves when nothing is pending (including work started while waiting). */
export async function whenIdle(): Promise<void> {
  while (pending.size) await Promise.allSettled([...pending]);
}

const cache = new Map<string, { value?: unknown; error?: unknown; promise?: Promise<unknown> }>();

/**
 * Load a value once per key and re-render when it arrives. Returns undefined until ready;
 * the render host never captures in that state because the load is tracked.
 */
export function useResource<T>(key: string, load: () => Promise<T>): T | undefined {
  const entry = cache.get(key);
  const [, force] = useState(0);
  if (!entry) {
    const e: { value?: unknown; error?: unknown; promise?: Promise<unknown> } = {};
    e.promise = trackPending(
      load().then(
        (v) => (e.value = v),
        (err) => (e.error = err),
      ),
    );
    cache.set(key, e);
  }
  const e = cache.get(key)!;
  useEffect(() => {
    if (e.value === undefined && e.error === undefined) e.promise!.then(() => force((n) => n + 1));
  }, [e]);
  if (e.error) throw e.error;
  return e.value as T | undefined;
}
