/**
 * Hard wall-clock timeout for Neon-backed server work.
 * Prevents Fluid Active CPU from hanging on a stuck DB connection.
 * Realtime (PartyKit/Ably) can replace polling later — keep SQL timeouts either way.
 */
export async function withTimeout<T>(
  work: () => Promise<T>,
  ms = 10_000,
  label = "Database",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export const DB_TIMEOUT_MS = 10_000;
