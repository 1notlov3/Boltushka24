const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

export const REALTIME_BROADCAST_EVENT = "msg";

const RETRY_DELAYS_MS = [0, 200, 800] as const;
const BROADCAST_TIMEOUT_MS = 5_000;

const wait = (delayMs: number) => new Promise((resolve) => {
  setTimeout(resolve, delayMs);
});

export async function broadcast(topic: string, payload: unknown): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.warn("[realtime] missing Supabase env, broadcast skipped");
    return;
  }

  let lastError: unknown = null;

  for (const delayMs of RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await wait(delayMs);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BROADCAST_TIMEOUT_MS);

    try {
      const res = await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SECRET_KEY,
          Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ topic, event: REALTIME_BROADCAST_EVENT, payload, private: false }],
        }),
      });

      if (res.ok) {
        return;
      }

      const text = await res.text().catch(() => "");
      lastError = new Error(`Broadcast failed ${res.status}: ${text}`);
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timeout);
    }
  }

  console.error("[realtime] broadcast failed after retries:", lastError);
}
