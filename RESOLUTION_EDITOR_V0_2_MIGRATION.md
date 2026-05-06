# Resolution Editor v0.2 Migration — DELEGATOR Checklist

This is a step-by-step checklist for a coding agent porting DELEGATOR from `@deutschemodelunitednations/munify-resolution-editor@0.1.x` to `0.2.x`. The library introduces a `ResolutionStore` abstraction; the old `resolution` + `onResolutionChange` props are gone.

DELEGATOR is a **Path A** consumer (single-user save flow, no real-time co-editing). We do _not_ need the `/yjs` subpath; we'll wrap content in a `createNativeStore` and pipe its `onChange` into the existing `resolutionContentStore`.

## Why this migration is worth doing

Beyond just keeping current with the library, this fixes a real bug: the comment in `newResolution/+page.svelte` (around line 124) says

> The `ResolutionEditor` stores a `$state` proxy in `$resolutionContentStore`, and proxy mutations don't trigger store subscriptions.

That is why the draft autosave currently **polls every second**. With `0.2`, `onChange` fires deterministically after every mutator, so we can replace the polling loop with subscription-driven autosave.

## Reference

- Library docs: `../munify-resolution-editor/README.md`, `../munify-resolution-editor/MIGRATION.md`, `../munify-resolution-editor/CHANGELOG.md`
- Reference implementation (Path A native store inside a modal): `../chase/src/lib/components/CreateAmendmentModal.svelte`

## Pre-flight

- [ ] Create branch `feat/resolution-editor-v0.2`
- [ ] Read `../munify-resolution-editor/MIGRATION.md` end-to-end (focus on "Path A — staying native")
- [ ] Skim `../munify-resolution-editor/CHANGELOG.md` for the removed-props table

## File-by-file changes

### 1. `package.json`

- [ ] Bump `@deutschemodelunitednations/munify-resolution-editor` to `^0.2.0` (or whatever the latest stable `0.2` is)
- [ ] Run `bun install`
- [ ] No new peer deps to add — DELEGATOR does **not** need `yjs`, `y-protocols`, or `y-websocket`

### 2. `src/lib/components/Paper/Editor/Resolution/ResolutionEditorWrapper.svelte`

This is the central bridge — most of the migration happens here.

**Goal**: replace direct `resolution` + `onResolutionChange` props with a `ResolutionStore` instance, while keeping `resolutionContentStore` working as the external sink (so callers in `paperhub/[paperId]/+page.svelte` etc. don't have to change).

- [ ] Remove the `$derived` of `resolution` from `$resolutionContentStore`.
- [ ] Import `createNativeStore`, `createEmptyResolution`, and `type ResolutionStore` from the library:

  ```ts
  import {
  	ResolutionEditor,
  	createNativeStore,
  	createEmptyResolution,
  	type ResolutionStore
  } from '@deutschemodelunitednations/munify-resolution-editor';
  ```

- [ ] Replace the body so the wrapper owns a `ResolutionStore`:

  ```svelte
  <script lang="ts">
  	// imports unchanged except as above
  	import { get } from 'svelte/store';
  	import { untrack } from 'svelte';

  	let { committeeName, editable = true, headerData /* snippets */ }: Props = $props();

  	const labels = getResolutionLabels();

  	// Seed store from whatever was already in the external store, or an empty resolution.
  	const initial =
  		untrack(() => get(resolutionContentStore)) ?? createEmptyResolution(committeeName);

  	const store: ResolutionStore = createNativeStore(initial, {
  		onChange: (snapshot) => {
  			// Mirror to the legacy svelte store so the rest of the app keeps working.
  			resolutionContentStore.set(snapshot);
  		}
  	});

  	// External resets ($resolutionContentStore = undefined / saved draft restore) are
  	// rare but real. When the external store is replaced wholesale, push it into the
  	// editor store via replaceResolution (which preserves clause ids where possible).
  	$effect(() => {
  		const external = $resolutionContentStore;
  		if (!external) return;
  		if (external === store.snapshot) return; // skip self-echo
  		// Cheap identity guard — if structurally equal, also skip.
  		if (JSON.stringify(external) === JSON.stringify(store.snapshot)) return;
  		store.replaceResolution(external);
  	});

  	$effect(() => () => store.destroy());

  	function handleCopySuccess() {
  		toast.success(m.phraseCopied());
  	}
  	function handleCopyError() {
  		toast.error(m.copyFailed());
  	}
  </script>

  <ResolutionEditor
  	{store}
  	{editable}
  	{headerData}
  	{labels}
  	preamblePhrases={germanPreamblePhrases}
  	operativePhrases={germanOperativePhrases}
  	onCopySuccess={handleCopySuccess}
  	onCopyError={handleCopyError}
  	{clauseToolbar}
  	{clauseAnnotations}
  	{previewHeader}
  	{previewFooter}
  />
  ```

- [ ] Drop the `committeeName`, `resolution`, `onResolutionChange` props from the `<ResolutionEditor>` invocation — they no longer exist on the library component.
- [ ] Verify that the wrapper still re-creates the store when `paperId` changes. The current pattern (parent uses `{#key paperId}` or remounts via `editorKey++`) keeps the wrapper instance fresh, so `createNativeStore(initial, ...)` runs again with the new content. Confirm this is the case in:
  - `src/routes/(authenticated)/dashboard/[conferenceId]/paperhub/[paperId]/+page.svelte`
  - `src/routes/(authenticated)/dashboard/[conferenceId]/paperhub/newResolution/+page.svelte`
  - `src/routes/(authenticated)/dashboard/[conferenceId]/paperhub/view/[paperId]/+page.svelte`

  If any of them keep the same wrapper mounted across paper switches, add a `{#key paperData?.id}` block.

### 3. `src/routes/(authenticated)/dashboard/[conferenceId]/paperhub/newResolution/+page.svelte`

The big win here: replace the 1-second autosave polling loop with subscription-driven autosave.

- [ ] Delete the `setInterval(saveCurrentDraft, 1000)` setup (lines around 170–184).
- [ ] Subscribe to the existing `resolutionContentStore` with debouncing:

  ```ts
  import { resolutionContentStore } from '$lib/components/Paper/Editor/editorStore';

  // ... existing code ...

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  $effect(() => {
  	const unsubscribe = resolutionContentStore.subscribe((content) => {
  		if (!browser || !draftStore || showRecoveryModal) return;
  		if (content === undefined) return;
  		if (saveTimer) clearTimeout(saveTimer);
  		saveTimer = setTimeout(() => {
  			saveCurrentDraft();
  			saveTimer = null;
  		}, 500);
  	});
  	return () => {
  		unsubscribe();
  		if (saveTimer) clearTimeout(saveTimer);
  	};
  });
  ```

- [ ] Update the comment at line ~124 — the `$state` proxy issue is resolved by the new `onChange` callback. Replace it with something like:

  > Autosave debounces on `resolutionContentStore` updates. The library's
  > native store mirrors snapshots into the external store via `onChange`,
  > so subscriptions fire reliably.

- [ ] Keep `saveCurrentDraft()` itself unchanged. The `beforeunload` safety net stays.

### 4. `src/routes/(authenticated)/dashboard/[conferenceId]/paperhub/[paperId]/+page.svelte`

- [ ] No code change required — this file only reads/writes `$resolutionContentStore` for save/load. The wrapper still keeps the external store in sync.
- [ ] Verify the wrapper is keyed on `paperData.id` so a navigation from one paper to another reseeds the store. If it isn't, wrap the editor mount in `{#key paperData?.id}`.

### 5. `src/routes/(authenticated)/dashboard/[conferenceId]/paperhub/view/[paperId]/+page.svelte`

- [ ] Same as `[paperId]/+page.svelte` — no code change unless the wrapper isn't keyed.

### 6. `src/lib/components/Paper/Editor/Resolution/index.ts`

- [ ] Add the new exports to the re-export barrel so other parts of the app can also create native stores if needed:

  ```ts
  export {
  	// existing exports...
  	createNativeStore,
  	createEmptyNativeStore,
  	type ResolutionStore,
  	type TextHandle,
  	type TextLocation,
  	type ClausePath,
  	type SubclausesBlockPath,
  	type NativeStoreOptions
  } from '@deutschemodelunitednations/munify-resolution-editor';
  ```

### 7. `src/lib/resolution-editor-i18n.ts`

- [ ] Open the file and check for any references to label keys `startEditing` or `doneEditing`. These were removed in `0.2`.
- [ ] Delete those keys from any custom labels object DELEGATOR builds.
- [ ] If a typed object literal that previously included these keys is now flagged by `bun run check`, remove the keys.

### 8. `src/lib/components/Paper/Editor/editorStore.ts`

- [ ] No structural change required. `resolutionContentStore` stays as `writable<Resolution | undefined>()` and is still the single source of truth for "what's currently being edited" from the perspective of save/draft callers.
- [ ] Optional cleanup: rename `addToPanel('resolutionContentStore', …)` debug label if you want, but not required.

## Search-and-replace audit

After file-level changes, scan the repo for stragglers:

- [ ] `rg "onResolutionChange" src/` — should return zero hits.
- [ ] `rg "ResolutionEditor.*resolution=" src/` — zero hits in JSX/svelte attributes.
- [ ] `rg "startEditing|doneEditing" src/` — zero hits in any messages or label files.
- [ ] `rg "munify-resolution-editor" src/ | rg -v "0.2"` — sanity-check there isn't a pinned old version anywhere outside `package.json`.

## Verification

- [ ] `bun run check` — Svelte-check passes (no type errors).
- [ ] `bun run lint` — Prettier + ESLint pass.
- [ ] `bun run dev` — boots cleanly, no runtime errors in the browser console.
- [ ] **Manual smoke tests** — open the app and verify each editor flow:
  - [ ] **New resolution** (`/dashboard/[conferenceId]/paperhub/newResolution`): pick agenda item, type into preamble + operative clauses, refresh page, verify draft restore modal offers correct content.
  - [ ] **Existing draft paper** (`/dashboard/[conferenceId]/paperhub/[paperId]` for a `WORKING_PAPER`): edit clauses, click Save, verify content persists. Add a sub-clause; indent/outdent it.
  - [ ] **View existing paper version** (`/dashboard/[conferenceId]/paperhub/view/[paperId]`): preview renders correctly.
  - [ ] **Reviewer mode**: open a working paper as a reviewer, verify quote selection still works.
  - [ ] **Switch between papers** without page reload: verify the editor reseeds with the new paper's content (this is where missing `{#key}` blocks bite).
- [ ] **Validation error path**: open a paper with invalid content (e.g. craft one in DB studio); verify the validation error fallback still renders, the editor doesn't mount, and the raw content is preserved.

## Rollback plan

If something goes wrong in production:

1. Revert the `package.json` bump to `^0.1.1`.
2. Revert `ResolutionEditorWrapper.svelte` and `newResolution/+page.svelte`.
3. The schema is unchanged; nothing in the database needs touching.

## Out of scope (don't do these now)

- **Y.js / real-time co-editing** — DELEGATOR doesn't need it. Consumers stay single-user. Don't import from `/yjs`.
- **Removing the `resolutionContentStore` writable** — keeping it preserves the current save/load flow. A future refactor can collapse it into the native store directly, but that's not required for this migration.
- **Changing how `editorContentStore` (TipTap content) works** — only `resolutionContentStore` is affected.

## Commit hygiene

- [ ] One commit for the dependency bump + wrapper rewrite (atomic so revert is easy).
- [ ] One commit for the autosave polling → subscription change.
- [ ] One commit for any i18n/label cleanup.
- [ ] PR description should link to the library `CHANGELOG.md` and call out that this fixes the autosave-polling kludge.
