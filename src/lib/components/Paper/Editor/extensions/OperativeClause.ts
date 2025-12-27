import { Node, mergeAttributes } from '@tiptap/core';

export const OperativeClause = Node.create({
	name: 'operativeClause',

	// Acts as a block-level element
	group: 'block',

	// Logic: An operative clause has text content, and optionally a nested list
	content: 'paragraph subClauseGroup* paragraph*',

	// Good for dragging
	draggable: true,

	parseHTML() {
		return [{ tag: 'li[data-type="operative-clause"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		// We render as 'li' so we can use a parent <ol> for numbering if we want,
		// or just divs with CSS counters. Let's use <li> for semantics.
		return ['li', mergeAttributes(HTMLAttributes, { 'data-type': 'operative-clause' }), 0];
	}
});
