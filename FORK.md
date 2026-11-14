# This fork

`origin` is jonnyasmar/ardia, `upstream` is ardia-browser/ardia. `main` is upstream's `main` plus this fork's own
commits (this file, `scripts/fork`, and features upstream doesn't take from outside contributors).

## Daily loop

| Task | Command |
| --- | --- |
| JS dev server | `pnpm dev` (atrium: `workspace-command start metro`) |
| Build and open the Debug app on `~/Library/Application Support/Ardia Dev` | `scripts/fork/dev` |
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

There's no Chromium tree here, so builds use the prebuilt engine nearest this checkout's `engine/`
(`packages/ardiacore/scripts/fetch-engine.sh --nearest`). When upstream changes `engine/` after its last published
engine, that change is missing until upstream publishes the next one. Don't change `engine/` here: a fork with no
Chromium build can't build it.

## Staying current

```sh
git fetch upstream
git merge upstream/main
pnpm install
scripts/agent/locked pod -- sh -c 'cd apps/browser/macos && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install'
scripts/fork/install
```

`pod install` is needed only when `Podfile.lock` changed or native files were added. Use CocoaPods 1.17, as upstream
does: the build refuses a `Pods/` written by another version. `pod install` quotes `MARKETING_VERSION` in
`project.pbxproj`; undo that before committing
(`sed -i '' 's/MARKETING_VERSION = "\([^"]*\)";/MARKETING_VERSION = \1;/' apps/browser/macos/Ardia.xcodeproj/project.pbxproj`).

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
