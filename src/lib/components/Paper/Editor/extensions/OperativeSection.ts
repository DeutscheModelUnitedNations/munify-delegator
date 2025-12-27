import { Node, mergeAttributes } from '@tiptap/core';

export const OperativeSection = Node.create({
	name: 'operativeSection',

	group: 'block',

	content: 'operativeClause*',

	draggable: false,

	parseHTML() {
		return [{ tag: 'ol[data-type="operative-section"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		// We render an <ol> to be semantically correct for a numbered list
		return ['ol', mergeAttributes(HTMLAttributes, { 'data-type': 'operative-section' }), 0];
	}
});
