import assert from "node:assert/strict";
import { test } from "node:test";
const { useBrowser } = await import("../browser/store.ts");
const drops = await import("../drag/drops.ts");
const { splitTabIdsOf } = await import("./splits.ts");
const { sidebarEntries } = await import("../sidebar/entries.ts");
await import("../../test-native/index.ts");

const S = () => useBrowser.getState();
const host = (id) => new URL(S().tabs[id].pinnedUrl || S().tabs[id].url).hostname.split(".")[0];
const panes = (w) => Object.values(S().splits).filter((v) => v.windowId === w).map((v) => splitTabIdsOf(v).map(host));
const groups = (w) => Object.values(S().groups).filter((g) => g.windowId === w).map((g) => g.tabIds.map(host));
const shown = (w) => S().windows[w].activeTabIds[S().windows[w].profileId];
const onto = (ids, targetId, source = { kind: "tab" }) => S().dropTabs(ids, drops.resolveDrop(S(), source, { zone: "onto", targetId }));

function windowWith(...hosts) {
  const w = S().createWindow({ url: `https://${hosts[0]}.com/` });
  const ids = [S().windows[w].tabIds[0]];
  for (const h of hosts.slice(1)) ids.push(S().newTab(w, { url: `https://${h}.com/`, background: true }));
  return { w, ids };
}

function splitting(...hosts) {
  S().hydrate({});
  S().updateSettings({ dragOntoTabSplits: true });
  return windowWith(...hosts);
}

test("with Drag a tab onto another to split them on, a tab dropped on another opens the two as a split, the dropped tab on the right and shown", () => {
  const { w, ids: [a, b, c] } = splitting("a", "b", "c");
  S().activate(b);
  assert.equal(onto([c], a), true);
  assert.deepEqual(panes(w), [["a", "c"]]);
  assert.equal(Object.values(S().splits)[0].orientation, "horizontal");
  assert.deepEqual(groups(w), [], "no group");
  assert.deepEqual(S().windows[w].tabIds, [a, c, b]);
  assert.equal(shown(w), c);
  assert.deepEqual(sidebarEntries(S(), w).list, [`s:${Object.keys(S().splits)[0]}`, `t:${b}`]);
});

test("a selection of two dropped on a tab makes a three-pane split, and the selection ends", () => {
  const { w, ids: [a, , c, , e] } = splitting("a", "b", "c", "d", "e");
  S().setSelection(w, [c, e]);
  const moving = drops.movingTabIds(S(), e);
  assert.deepEqual(moving, [c, e]);
  assert.equal(onto(moving, a), true);
  assert.deepEqual(panes(w), [["a", "c", "e"]]);
  assert.deepEqual(S().selection[w], []);
  assert.equal(shown(w), c);
});

test("more tabs than a split holds are grouped with the target instead", () => {
  const { w, ids: [a, b, c, d] } = splitting("a", "b", "c", "d", "e");
  assert.equal(onto([b, c, d], a), true);
  assert.deepEqual(panes(w), []);
  assert.deepEqual(groups(w), [["a", "b", "c", "d"]]);
});

test("a tab dropped on a pinned row makes one pinned split row; a Top Apps tile dropped on an unpinned tab is unpinned into the split", () => {
  const { w, ids: [a, b, c, d] } = splitting("a", "b", "c", "d");
  S().pinTabs([a], true, true);
  S().pinTabs([b], true);
  assert.equal(onto([c], a), true);
  const rowSplit = Object.values(S().splits)[0];
  assert.deepEqual(splitTabIdsOf(rowSplit), [a, c]);
  assert.equal(S().tabs[a].pin?.as === "row" && S().tabs[c].pin?.as === "row", true, "both panes are pinned rows");
  assert.deepEqual(sidebarEntries(S(), w).pinned, [`s:${rowSplit.id}`], "one pinned split row");
  assert.equal(onto([b], d), true);
  const tileSplit = Object.values(S().splits).find((v) => v.id !== rowSplit.id);
  assert.deepEqual(splitTabIdsOf(tileSplit), [d, b]);
  assert.equal(S().tabs[b].pin, null, "the tile left Top Apps");
  assert.deepEqual(sidebarEntries(S(), w).tiles, []);
  assert.deepEqual(sidebarEntries(S(), w).list, [`s:${tileSplit.id}`]);
});

test("a Top Apps tile, a tab already in a split, and tabs of another window or profile are never split onto", () => {
  const { w, ids: [a, b, c, d, e] } = splitting("a", "b", "c", "d", "e");
  S().pinTabs([a], true);
  assert.equal(onto([e], a), false, "a tile target");
  const splitId = S().createSplit([b, c]);
  assert.equal(onto([e], b), false, "a split target");
  assert.deepEqual(splitTabIdsOf(S().splits[splitId]), [b, c]);
  const other = S().createWindow({ url: "https://x.com/" });
  const x = S().windows[other].tabIds[0];
  const work = S().createProfile({ name: "Work" });
  const y = S().newTab(w, { url: "https://y.com/", profileId: work, background: true });
  assert.equal(onto([x], d), false, "another window's tab");
  assert.equal(onto([y], d), false, "another profile's tab");
  assert.equal(onto([x, y, e], d), true);
  assert.deepEqual(panes(w), [["b", "c"], ["d", "e"]]);
  assert.equal(S().tabs[x].windowId, other);
});

test("a selected pane of another split leaves it for the new split", () => {
  const { w, ids: [a, b, c, d] } = splitting("a", "b", "c", "d");
  S().createSplit([b, c, d]);
  assert.equal(onto([d], a), true);
  assert.deepEqual(panes(w).sort(), [["a", "d"], ["b", "c"]]);
});

test("external drags and split rows are still refused onto a tab", () => {
  const { ids: [a] } = splitting("a", "b");
  assert.equal(drops.resolveDrop(S(), { kind: "split" }, { zone: "onto", targetId: a }).type, "none");
  assert.equal(drops.resolveDrop(S(), { kind: "tab", external: true }, { zone: "onto", targetId: a }).type, "none");
});

test("off, the drop groups as before", () => {
  const { w, ids: [a, b, c, d] } = splitting("a", "b", "c", "d");
  assert.equal(onto([b], a), true);
  S().updateSettings({ dragOntoTabSplits: false });
  assert.equal(onto([d], c), true);
  assert.deepEqual(panes(w), [["a", "b"]]);
  assert.deepEqual(groups(w), [["c", "d"]]);
  assert.equal(onto([a], c), false, "a grouped target changes nothing");
});
