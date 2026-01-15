import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
	OPERATIVE_OPENING_VERBS,
	validateOpeningPhrase,
	getFirstPhrase
} from './validation/openingPhrases';

const operativeValidationKey = new PluginKey('operativeValidation');

export const OperativeClause = Node.create({
	name: 'operativeClause',

	// Acts as a block-level element
	group: 'block',

	// Logic: An operative clause has text content, and optionally a nested list
	content: 'paragraph subClauseGroup* paragraph*',

	// Good for dragging
	draggable: true,

	addKeyboardShortcuts() {
		return {
			// Mod+Enter creates a new operative clause at the end
			'Mod-Enter': () => {
				let pos = -1;
				this.editor.state.doc.descendants((node, position) => {
					if (node.type.name === 'operativeSection') {
						pos = position + node.nodeSize - 1;
						return false;
					}
				});

				if (pos > -1) {
					return this.editor
						.chain()
						.focus()
						.insertContentAt(pos, {
							type: 'operativeClause',
							content: [{ type: 'paragraph' }]
						})
						.run();
				}
				return false;
			}
		};
	},

	parseHTML() {
		return [{ tag: 'li[data-type="operative-clause"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		// We render as 'li' so we can use a parent <ol> for numbering if we want,
		// or just divs with CSS counters. Let's use <li> for semantics.
		return ['li', mergeAttributes(HTMLAttributes, { 'data-type': 'operative-clause' }), 0];
	},

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: operativeValidationKey,
				props: {
					decorations: (state) => {
						const decorations: Decoration[] = [];

						state.doc.descendants((node, pos) => {
							if (node.type.name === 'operativeClause') {
								// Get the first paragraph's text
								const firstParagraph = node.firstChild;
								if (firstParagraph?.type.name !== 'paragraph') return;

								const text = firstParagraph.textContent;
								if (!text.trim()) return; // Skip empty

								const firstPhrase = getFirstPhrase(text);
								const validation = validateOpeningPhrase(text, OPERATIVE_OPENING_VERBS);

								if (!validation.isValid) {
									// Position is inside li > p
									const pPos = pos + 1; // +1 for entering the li
									const phraseEnd = pPos + 1 + firstPhrase.length; // +1 for entering the p
									decorations.push(
										Decoration.inline(pPos + 1, phraseEnd, {
											class: 'phrase-warning'
										})
									);
								}
							}
						});

						return DecorationSet.create(state.doc, decorations);
					}
				}
			})
		];
	}
});
