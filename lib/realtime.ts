const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

export const REALTIME_BROADCAST_EVENT = "msg";

export async function broadcast(topic: string, payload: unknown): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    console.warn("[realtime] missing Supabase env, broadcast skipped");
    return;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ topic, event: REALTIME_BROADCAST_EVENT, payload, private: false }],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[realtime] broadcast failed ${res.status}: ${text}`);
    }
  } catch (err) {
    console.warn("[realtime] broadcast error:", err);
  }
}
