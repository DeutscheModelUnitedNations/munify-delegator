import PaperFormat from './PaperFormat.svelte';
import ResolutionFormat from './ResolutionFormat.svelte';
import ResolutionEditor from './ResolutionEditor.svelte';
import ReviewFormat from './ReviewFormat.svelte';
import ReadOnlyContent from './ReadOnlyContent.svelte';
import * as DiffViewer from './DiffViewer';

export const Editor = {
	PaperFormat,
	ResolutionFormat, // Legacy - to be deprecated
	ResolutionEditor, // New resolution editor with dynamic committee name
	ReviewFormat,
	ReadOnlyContent,
	DiffViewer
};

export type { SvelteComponent } from 'svelte';
export default Editor;
