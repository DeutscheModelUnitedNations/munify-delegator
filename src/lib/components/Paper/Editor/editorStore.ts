import { addToPanel } from 'svelte-inspect-value';
import { writable } from 'svelte/store';
import type { Resolution } from '$lib/schemata/resolution';

// TipTap content for Position Papers and Introduction Papers
export const editorContentStore = writable<any>();

// Resolution content for Working Papers
export const resolutionContentStore = writable<Resolution | undefined>();

addToPanel('editorContentStore', () => editorContentStore);
addToPanel('resolutionContentStore', () => resolutionContentStore);
