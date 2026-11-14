import type { BrowserState } from "../browser/store";
import { isPinnedRow } from "../browser/model";
import { groupingOnto, placing } from "../pins/placing";
import { activated, apply } from "../tabs/tabs";
import { MAX_SPLIT_PANES, removeFromSplits, splitOf, withSplit } from "./splits";

export function splittingOnto(s: BrowserState, ids: string[], targetId: string): [BrowserState, string] {
  const target = s.tabs[targetId];
  const w = target && s.windows[target.windowId];
  if (!w || (target.pin && !isPinnedRow(target)) || splitOf(s, targetId)) return [s, ""];
  const moving = [...new Set(ids)].filter((id) => id !== targetId && s.tabs[id]?.windowId === w.id && s.tabs[id]?.profileId === target.profileId);
  if (!moving.length) return [s, ""];
  if (1 + moving.length > MAX_SPLIT_PANES) return groupingOnto(s, ids, targetId);
  const after = w.tabIds.slice(w.tabIds.indexOf(targetId) + 1).find((id) => !moving.includes(id)) ?? null;
  const loose = { ...s, splits: removeFromSplits(s.splits, new Set(moving)) };
  const placed = placing(loose, moving, isPinnedRow(target) ? { pinned: true, row: true, beforeId: after } : { pinned: false, beforeId: after });
  const [split, splitId] = withSplit(placed, [targetId, ...moving]);
  if (!splitId) return [s, ""];
  const shown = apply(split, activated(split, moving[0]!));
  return [{ ...shown, selection: { ...shown.selection, [w.id]: [] } }, splitId];
}
