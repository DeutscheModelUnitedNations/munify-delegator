import PaperFormat from './PaperFormat.svelte';
import ReviewFormat from './ReviewFormat.svelte';
import ReadOnlyContent from './ReadOnlyContent.svelte';
import * as DiffViewer from './diffViewer';
import * as Resolution from './resolution';

export const Editor = {
	PaperFormat,
	Resolution,
	ReviewFormat,
	ReadOnlyContent,
	DiffViewer
};

export type { SvelteComponent } from 'svelte';
export default Editor;
