import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * Regex for matching placeholders - same as in snippetPlaceholders.ts
 * Supports: Unicode letters, numbers, spaces, hyphens, underscores, and common punctuation
 */
const PLACEHOLDER_REGEX = /\{\{([\p{L}\p{N}\s\-_,.!?]+)\}\}/gu;

export interface PlaceholderHighlightOptions {
	/**
	 * CSS class to apply to highlighted placeholders
	 */
	className: string;
}

/**
 * TipTap extension that highlights placeholder patterns like {{name}} in the editor
 */
export const PlaceholderHighlight = Extension.create<PlaceholderHighlightOptions>({
	name: 'placeholderHighlight',

	addOptions() {
		return {
			className: 'placeholder-highlight'
		};
	},

	addProseMirrorPlugins() {
		const { className } = this.options;

		return [
			new Plugin({
				key: new PluginKey('placeholderHighlight'),
				props: {
					decorations: (state) => {
						const decorations: Decoration[] = [];
						const { doc } = state;

						doc.descendants((node, pos) => {
							if (!node.isText || !node.text) return;

							const text = node.text;
							let match;

							// Reset regex lastIndex
							PLACEHOLDER_REGEX.lastIndex = 0;

							while ((match = PLACEHOLDER_REGEX.exec(text)) !== null) {
								const start = pos + match.index;
								const end = start + match[0].length;

								decorations.push(
									Decoration.inline(start, end, {
										class: className
									})
								);
							}
						});

						return DecorationSet.create(doc, decorations);
					}
				}
			})
		];
	}
});
