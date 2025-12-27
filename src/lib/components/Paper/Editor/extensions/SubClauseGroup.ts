import { Node, mergeAttributes } from '@tiptap/core';

export const SubClauseGroup = Node.create({
	name: 'subClauseGroup',

	group: 'block',

	// Must contain at least one subClause
	content: 'subClause+',

	draggable: true,

	parseHTML() {
		return [{ tag: 'ol[data-type="sub-clause-group"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['ol', mergeAttributes(HTMLAttributes, { 'data-type': 'sub-clause-group' }), 0];
	}
});
