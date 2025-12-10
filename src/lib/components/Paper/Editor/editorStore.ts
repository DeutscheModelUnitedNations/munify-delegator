import { addToPanel } from 'svelte-inspect-value';
import { writable } from 'svelte/store';

export const editorContentStore = writable<any>();

addToPanel('editorContentStore', () => editorContentStore);
