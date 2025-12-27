import { Node, mergeAttributes } from '@tiptap/core';

export const PreambleClause = Node.create({
	name: 'preambleClause',

	group: 'block',

	// Only allows text and inline marks (bold, italic), no other blocks
	content: 'inline*',

	// Good UI UX: If you press enter, create another preamble clause
	addKeyboardShortcuts() {
		return {
			Enter: () => this.editor.commands.createParagraphNear()
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-type="preamble-clause"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'preamble-clause' }), 0];
	}
});
