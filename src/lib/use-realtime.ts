import { useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
import { pingMessage } from "@/lib/ping";

/** Live badge for DMs and notices. Falls back to the existing Neon poll when Supabase is not configured. */
export function useRealtimeInbox(userId: string | null, onPing: () => void) {
  const ping = useRef(onPing);
  ping.current = onPing;
  useEffect(() => {
    const sb = getSupabase();
    if (!sb || !userId) return;
    const channel = sb
      .channel(`kilode-inbox:${userId}`)
      .on("broadcast", { event: "message" }, () => {
        pingMessage();
        ping.current();
      })
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [userId]);
}

/** Tell the other person's open app that a message arrived. No-op without Supabase. */
export async function broadcastInbox(userId: string) {
  const sb = getSupabase();
  if (!sb || !userId) return;
  const channel = sb.channel(`kilode-inbox:${userId}`);
  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void channel.send({ type: "broadcast", event: "message", payload: { t: Date.now() } });
        window.setTimeout(() => {
          void sb.removeChannel(channel);
          resolve();
        }, 400);
      }
    });
    window.setTimeout(resolve, 1500);
  });
}
