import PaperFormat from './PaperFormat.svelte';
import ReviewFormat from './ReviewFormat.svelte';
import ReadOnlyContent from './ReadOnlyContent.svelte';
import * as DiffViewer from './DiffViewer';
import * as Resolution from './Resolution';

export const Editor = {
	PaperFormat,
	Resolution,
	ReviewFormat,
	ReadOnlyContent,
	DiffViewer
};

export type { SvelteComponent } from 'svelte';
export default Editor;
