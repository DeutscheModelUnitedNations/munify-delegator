import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
	PREAMBLE_OPENING_PHRASES,
	validateOpeningPhrase,
	getFirstPhrase
} from './validation/openingPhrases';

const preambleValidationKey = new PluginKey('preambleValidation');

export const PreambleClause = Node.create({
	name: 'preambleClause',

	group: 'block',

	// Only allows text and inline marks (bold, italic), no other blocks
	content: 'inline*',

	addKeyboardShortcuts() {
		return {
			// Enter creates a new preamble clause after current one
			Enter: () => {
				const { $from } = this.editor.state.selection;

				// Find the end of the current preamble clause
				const clauseEnd = $from.end();

				// Insert a new preamble clause after the current one
				return this.editor
					.chain()
					.focus()
					.insertContentAt(clauseEnd + 1, { type: 'preambleClause' })
					.run();
			},
			// Backspace on empty clause deletes it
			Backspace: () => {
				const { $from, empty } = this.editor.state.selection;
				const node = $from.parent;

				// Only handle if we're at the start of an empty clause
				if (empty && node.type.name === 'preambleClause' && node.content.size === 0) {
					// Don't delete if it's the only clause
					const preambleSection = $from.node(-1);
					if (preambleSection.childCount <= 1) {
						return false;
					}
					return this.editor.commands.deleteNode('preambleClause');
				}
				return false; // Let default behavior handle
			}
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-type="preamble-clause"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'preamble-clause' }), 0];
	},

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: preambleValidationKey,
				props: {
					decorations: (state) => {
						const decorations: Decoration[] = [];

						state.doc.descendants((node, pos) => {
							if (node.type.name === 'preambleClause') {
								const text = node.textContent;
								if (!text.trim()) return; // Skip empty clauses

								const firstPhrase = getFirstPhrase(text);
								const validation = validateOpeningPhrase(text, PREAMBLE_OPENING_PHRASES);

								if (!validation.isValid) {
									// Add warning decoration to first phrase
									const phraseEnd = pos + 1 + firstPhrase.length;
									decorations.push(
										Decoration.inline(pos + 1, phraseEnd, {
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
