import PaperFormat from './PaperFormat.svelte';
import ResolutionFormat from './ResolutionFormat.svelte';
import ReviewFormat from './ReviewFormat.svelte';
import ReadOnlyContent from './ReadOnlyContent.svelte';
import * as DiffViewer from './DiffViewer';

export const Editor = {
	PaperFormat,
	ResolutionFormat,
	ReviewFormat,
	ReadOnlyContent,
	DiffViewer
};

export type { SvelteComponent } from 'svelte';
export default Editor;
