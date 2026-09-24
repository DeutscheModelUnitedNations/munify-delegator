import { Mark, mergeAttributes } from '@tiptap/core';

export interface ReferenceMarkAttributes {
	blockId: string;
	originalText: string;
	previewText: string;
	createdAt: string;
	paperVersion: number;
}

export interface ReferenceMarkOptions {
	HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		referenceMark: {
			/**
			 * Set a reference mark
			 */
			setReferenceMark: (attributes: ReferenceMarkAttributes) => ReturnType;
			/**
			 * Toggle a reference mark
			 */
			toggleReferenceMark: (attributes: ReferenceMarkAttributes) => ReturnType;
			/**
			 * Unset a reference mark
			 */
			unsetReferenceMark: () => ReturnType;
		};
	}
}

export const ReferenceMark = Mark.create<ReferenceMarkOptions>({
	name: 'referenceMark',

	addOptions() {
		return {
			HTMLAttributes: {}
		};
	},

	addAttributes() {
		return {
			blockId: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-block-id'),
				renderHTML: (attributes) => {
					if (!attributes.blockId) return {};
					return { 'data-block-id': attributes.blockId };
				}
			},
			originalText: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-original-text'),
				renderHTML: (attributes) => {
					if (!attributes.originalText) return {};
					return { 'data-original-text': attributes.originalText };
				}
			},
			previewText: {
				default: '',
				parseHTML: (element) => element.getAttribute('data-preview-text'),
				renderHTML: (attributes) => {
					if (!attributes.previewText) return {};
					return { 'data-preview-text': attributes.previewText };
				}
			},
			createdAt: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-created-at'),
				renderHTML: (attributes) => {
					if (!attributes.createdAt) return {};
					return { 'data-created-at': attributes.createdAt };
				}
			},
			paperVersion: {
				default: null,
				parseHTML: (element) => {
					const val = element.getAttribute('data-paper-version');
					return val ? parseInt(val, 10) : null;
				},
				renderHTML: (attributes) => {
					if (attributes.paperVersion == null) return {};
					return { 'data-paper-version': String(attributes.paperVersion) };
				}
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-reference]'
			}
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'span',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				'data-reference': '',
				class: 'reference-chip'
			}),
			0
		];
	},

	addCommands() {
		return {
			setReferenceMark:
				(attributes) =>
				({ commands }) => {
					return commands.setMark(this.name, attributes);
				},
			toggleReferenceMark:
				(attributes) =>
				({ commands }) => {
					return commands.toggleMark(this.name, attributes);
				},
			unsetReferenceMark:
				() =>
				({ commands }) => {
					return commands.unsetMark(this.name);
				}
		};
	}
});

/**
 * Creates preview text from original text, truncating if needed
 */
export function createPreviewText(text: string, maxLength = 50): string {
	const trimmed = text.trim();
	if (trimmed.length <= maxLength) {
		return trimmed;
	}
	return trimmed.substring(0, maxLength - 3) + '...';
}
