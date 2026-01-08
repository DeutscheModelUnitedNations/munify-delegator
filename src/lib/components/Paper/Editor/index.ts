import PaperFormat from './PaperFormat.svelte';
import ResolutionFormat from './ResolutionFormat.svelte';
import ReviewFormat from './ReviewFormat.svelte';
import ReadOnlyContent from './ReadOnlyContent.svelte';

export const Editor = {
	PaperFormat,
	ResolutionFormat,
	ReviewFormat,
	ReadOnlyContent
};

export type { SvelteComponent } from 'svelte';
export default Editor;
