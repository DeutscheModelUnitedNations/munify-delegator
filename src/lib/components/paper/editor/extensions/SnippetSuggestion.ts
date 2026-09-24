import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import type { SuggestionOptions } from '@tiptap/suggestion';
import type { JSONContent } from '@tiptap/core';
import { createSuggestionRenderer, type SnippetItem } from './suggestionRenderer';

export type { SnippetItem } from './suggestionRenderer';

export interface SnippetSuggestionOptions {
	/** Static array of snippets OR a getter function that returns current snippets */
	snippets: SnippetItem[] | (() => SnippetItem[]);
	onSelectSnippet?: (snippet: SnippetItem) => void;
	suggestion?: Partial<SuggestionOptions<SnippetItem>>;
}

export const SnippetSuggestion = Extension.create<SnippetSuggestionOptions>({
	name: 'snippetSuggestion',

	addOptions() {
		return {
			snippets: [],
			onSelectSnippet: undefined,
			suggestion: {
				char: '/',
				allowSpaces: false,
				startOfLine: false
			}
		};
	},

	addProseMirrorPlugins() {
		const { onSelectSnippet, snippets: snippetsOption } = this.options;

		// Support both static array and getter function
		const getSnippets = (): SnippetItem[] => {
			if (typeof snippetsOption === 'function') {
				return snippetsOption();
			}
			return snippetsOption;
		};

		return [
			Suggestion<SnippetItem>({
				editor: this.editor,
				char: '/',
				allowSpaces: false,
				startOfLine: false,

				items: ({ query }) => {
					const currentSnippets = getSnippets();
					return currentSnippets
						.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
						.slice(0, 10);
				},

				command: ({ editor, range, props }) => {
					// Delete the trigger text first
					editor.chain().focus().deleteRange(range).run();

					// Call the onSelectSnippet callback if provided
					// This allows the parent to handle placeholder prompts before insertion
					if (onSelectSnippet) {
						onSelectSnippet(props);
					} else {
						// Default behavior: insert content directly
						editor.chain().focus().insertContent(props.content).run();
					}
				},

				render: () => createSuggestionRenderer(onSelectSnippet),

				...this.options.suggestion
			})
		];
	}
});
