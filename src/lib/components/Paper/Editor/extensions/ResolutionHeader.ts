import { Node, mergeAttributes } from '@tiptap/core';

export interface ResolutionHeaderOptions {
	committeeName: string;
}

export const ResolutionHeader = Node.create<ResolutionHeaderOptions>({
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

	addOptions() {
		return {
			committeeName: ''
		};
	},

	addAttributes() {
		return {
			committeeName: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-committee-name') || '',
				renderHTML: (attributes) => ({
					'data-committee-name': attributes.committeeName
				})
			}
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-type="resolution-header"]' }];
	},

	renderHTML({ HTMLAttributes, node }) {
		// Get committee name from node attributes, options, or fallback
		const committeeName =
			node.attrs.committeeName || this.options.committeeName || 'COMMITTEE NAME';

		return [
			'div',
			mergeAttributes(HTMLAttributes, { 'data-type': 'resolution-header' }),
			committeeName.toUpperCase() + ','
		];
	}
});
