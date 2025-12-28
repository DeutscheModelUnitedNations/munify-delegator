import { Node, mergeAttributes } from '@tiptap/core';

export const ResolutionHeader = Node.create({
	name: 'resolutionHeader',

	group: 'block',

	// 'atom: true' makes it a single uneditable unit.
	// The user cannot delete individual characters inside it.
	atom: true,

	// It cannot contain any content, it just IS the content.
	content: '',

	// Not draggable, acts like a locked title
	draggable: false,

	// If the user tries to select it, we want it to select the whole block
	selectable: false,

	parseHTML() {
		return [{ tag: 'div[data-type="resolution-header"]' }];
	},

	renderHTML({ HTMLAttributes }) {
		// We hardcode the text "DER SICHERHEITSRAT," inside the render function
		return [
			'div',
			mergeAttributes(HTMLAttributes, { 'data-type': 'resolution-header' }),
			'DER SICHERHEITSRAT,'
		];
	}
});
