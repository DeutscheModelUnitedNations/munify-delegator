import { addToPanel } from 'svelte-inspect-value';
import { writable } from 'svelte/store';
import {
	createNativeStore,
	createEmptyResolution
} from '@deutschemodelunitednations/munify-resolution-editor';

// TipTap content for Position Papers and Introduction Papers
export const editorContentStore = writable<any>();

// Resolution content for Working Papers.
//
// Backed by the resolution-editor library's native store: `snapshot` is the
// single source of truth. Pages seed it via `replaceResolution(...)` and read
// edits back from `resolutionStore.snapshot`.
export const resolutionStore = createNativeStore(createEmptyResolution(''));

addToPanel('editorContentStore', () => editorContentStore);
