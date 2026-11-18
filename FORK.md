# This fork

`origin` is jonnyasmar/ardia, `upstream` is ardia-browser/ardia. `main` is upstream's `main` plus this fork's own
commits (this file, `scripts/fork`, and features upstream doesn't take from outside contributors).

## Daily loop

| Task | Command |
| --- | --- |
| JS dev server | `pnpm dev` (atrium: `workspace-command start metro`) |
| Build and open the Debug app on `~/Library/Application Support/Ardia Dev` | `scripts/fork/dev` |
| Merge upstream and update dependencies | `scripts/fork/sync` |
| Build, sign and install the Release app as your browser | quit Ardia, then `scripts/fork/install` |
| Hidden test instance | `scripts/agent/ac launch apps/browser/build-jonny/Build/Products/Debug/Ardia.app --data <scratch>/data` |

JS-only changes need no build: Metro serves them to the Debug app. Relaunch before judging.

The Release app keeps upstream's bundle id, so it uses your existing profile. It is signed with your Developer ID,
Sparkle is off, and the app it replaced is in `apps/browser/build-fork/previous/`. `scripts/fork/install --help` has
the caveats.

## Fork-only features

Keep each one's footprint on upstream files small (new files, appended lines), so merging upstream stays clean.

| Feature | Where |
| --- | --- |
| Settings › Tabs › Tab groups › Drag a tab onto another to split them (`dragOntoTabSplits`, off by default): dropping a tab on a tab opens a split, as in Arc, instead of a group. Pinned row targets make a pinned split row; more than three panes falls back to a group | `state/splits/splitOnto.ts`, the `onto` case in `state/drag/drops.ts` |

## Engine

`~/chromium-build` holds a Chromium tree since 2026-11-17 (built for #401's web push, `docs/engine-build.md` ›
Rebuilding; the first build compiled for 4 h 43 min at 6 jobs and linked in 20 min on this M3 Max). `scripts/fork/env.sh` builds the app against its framework once
`out/Release_GN_arm64/Chromium Framework.framework` is linked, and against the prebuilt engine nearest this checkout's
`engine/` (`packages/ardiacore/scripts/fetch-engine.sh --nearest`) until then; `ARDIACORE_FRAMEWORK` overrides both.
On this Mac, build the engine at low priority so the Mac stays usable: `nice -n 15`, at most 6 local jobs
(`-local_jobs=6` and `SISO_LIMITS=step=12,local=6,remote=6,startlocal=6,fastlocal=6`, which `scripts/agent/engine-build`
doesn't set: it sizes jobs by RAM), with `scripts/agent/cpu-cap --memory-only` running. Spotlight ignores
`~/chromium-build/.metadata_never_index` on macOS 26, so the folder is in Spotlight's Search Privacy list instead.

When the engine isn't an exact match, `scripts/fork/dev` and `install` print the engine API the app gained since it
was built. The app calls those methods directly, so the feature behind each one crashes until a newer engine is
published: leave it off. Example from 2026-11-14: Unload inactive profiles (an advanced setting; `sleepIdleProfile:hostedTabs:`)
must stay on Never.

## Staying current

```sh
scripts/fork/sync      # fetch upstream, merge it, pnpm install and pod install
scripts/fork/install   # quit Ardia first
```

On a conflict, resolve it, commit, and run `scripts/fork/sync` again. A Debug build made before the pod install fails
to link new native files (an undefined `_OBJC_CLASS_$_…`): sync installs the Pods every time for that reason. Use
CocoaPods 1.17, as upstream does. When upstream changes the release signing (`scripts/release/export-sign.sh`), mirror
it in `scripts/fork/install`.

## Sending a change upstream

Upstream's rules are `CONTRIBUTING.md`. Until you're on `.github/VOUCHED.td`, upstream takes only bug fixes: a new
setting or behaviour is a feature, and its idea goes to Discussions › Ideas instead.

1. Open the issue with the bug form (it adds the `bug` label).
2. Branch from upstream, not from this `main`, and bring over only that fix's commits:
   `git switch -c fix/<name> upstream/main && git cherry-pick <commits>`.
3. `git push -u origin fix/<name>`, then
   `gh pr create --repo ardia-browser/ardia --base main --head jonnyasmar:fix/<name>`.
4. The description says `Closes #<issue>`, shows a before and after video under Verification, and ends with the
   model and harness that did the work. Sign the CLA when its bot asks, and answer Greptile's threads.
