import { Node, mergeAttributes } from '@tiptap/core';

export const PreambleSection = Node.create({
	name: 'preambleSection',

	// 'block' puts it in the vertical flow of the document
	group: 'block',

	content: 'preambleClause*',

	parseHTML() {
		return [{ tag: 'div[data-type="preamble-section"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'preamble-section' }), 0];
	}
});
