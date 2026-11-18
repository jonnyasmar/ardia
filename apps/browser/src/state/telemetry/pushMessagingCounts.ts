import { useTelemetry } from "./choice";

export type PushMessagingTotals = { subscribed: number; subscribeFailed: number; subscribeRefusedOff: number; delivered: number };

const KINDS = ["subscribed", "subscribeFailed", "subscribeRefusedOff", "delivered"] as const;
const none = (): PushMessagingTotals => ({ subscribed: 0, subscribeFailed: 0, subscribeRefusedOff: 0, delivered: 0 });

let seen: PushMessagingTotals | null = none();
let pending = none();

useTelemetry.subscribe((s, prev) => {
  if (s.sharing === prev.sharing) return;
  seen = null;
  pending = none();
});

export function notePushMessaging(totals: Partial<PushMessagingTotals> | undefined) {
  if (!totals) return;
  const previous = seen;
  const next = none();
  for (const kind of KINDS) {
    const total = Math.max(0, Number(totals[kind]) || 0);
    next[kind] = Math.max(total, previous?.[kind] ?? 0);
    if (previous) pending[kind] += Math.max(0, total - previous[kind]);
  }
  seen = next;
}

export function takePushMessagingCounts() {
  const taken = pending;
  pending = none();
  return {
    push_subscribes: taken.subscribed,
    push_subscribe_failures: taken.subscribeFailed,
    push_subscribes_refused_off: taken.subscribeRefusedOff,
    push_messages_delivered: taken.delivered,
  };
}
