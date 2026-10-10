import { loadPaperIntoEditor, type PaperIdentity } from './paperDisplay';

/**
 * Which paper the shared editor stores currently hold. A page loads each paper into them once,
 * when it first arrives, and shows the editor only after that (`initialized`); reloading on every
 * live update would overwrite what the author is typing.
 */
export class LoadedPaper {
	initialized = $state(false);
	paperId = $state<string | null>(null);
	/** Why a working paper's content could not be read as a resolution, if it could not. */
	validationError = $state<string | null>(null);
	/** That unreadable content, offered as a download. */
	invalidRawContent = $state<unknown>(null);

	/** Loads `paper` into the editor unless it is already the one loaded. */
	loadIfNew(paper: PaperIdentity, latestContent: unknown) {
		if (paper.id === this.paperId) return;
		const result = loadPaperIntoEditor(paper, latestContent);
		this.validationError = result.validationError;
		this.invalidRawContent = result.invalidRawContent;
		this.paperId = paper.id;
		this.initialized = true;
	}
}
