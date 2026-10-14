import { loadPaperIntoEditor, type PaperIdentity } from './paperDisplay';

/**
 * Which paper the shared editor stores currently hold. A page loads each paper into them once,
 * when it first arrives, and shows the editor only after that (`initialized`); reloading on every
 * live update would overwrite what the author is typing.
 */
export function createLoadedPaper() {
	let initialized = $state(false);
	let paperId = $state<string | null>(null);
	let validationError = $state<string | null>(null);
	let invalidRawContent = $state<unknown>(null);

	return {
		get initialized() {
			return initialized;
		},
		set initialized(value: boolean) {
			initialized = value;
		},
		get paperId() {
			return paperId;
		},
		/** Why a working paper's content could not be read as a resolution, if it could not. */
		get validationError() {
			return validationError;
		},
		/** That unreadable content, offered as a download. */
		get invalidRawContent() {
			return invalidRawContent;
		},

		/** Loads `paper` into the editor unless it is already the one loaded. */
		loadIfNew(paper: PaperIdentity, latestContent: unknown) {
			if (paper.id === paperId) return;
			const result = loadPaperIntoEditor(paper, latestContent);
			validationError = result.validationError;
			invalidRawContent = result.invalidRawContent;
			paperId = paper.id;
			initialized = true;
		}
	};
}

export type LoadedPaper = ReturnType<typeof createLoadedPaper>;
