import { Node, mergeAttributes } from '@tiptap/core';

export const SubClause = Node.create({
	name: 'subClause',

	group: 'block', // 'listItem' group is handled by the helper usually, but 'block' works if we manually bind

	content: 'paragraph subClauseGroup?',

	draggable: true,

	parseHTML() {
		return [{ tag: 'li[data-type="sub-clause"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['li', mergeAttributes(HTMLAttributes, { 'data-type': 'sub-clause' }), 0];
	},

	addKeyboardShortcuts() {
		return {
			// Enter splits into new sub-clause
			Enter: () => this.editor.commands.splitListItem('subClause'),
			// Tab indents (sinks into nested list)
			Tab: () => this.editor.commands.sinkListItem('subClause'),
			// Shift-Tab outdents (lifts from nested list)
			'Shift-Tab': () => this.editor.commands.liftListItem('subClause')
		};
	}
});
