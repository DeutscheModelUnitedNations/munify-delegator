import type { Editor } from '@tiptap/core';
import { m } from '$lib/paraglide/messages';
// Type-only: these bring the heading and list commands into `ChainedCommands`.
import type {} from '@tiptap/extension-heading';
import type {} from '@tiptap/extension-list';

/** A formatting the toolbar can switch on and off at the cursor. */
interface Toggle {
	label: () => string;
	icon: string;
	isActive: (editor: Editor) => boolean;
	toggle: (editor: Editor) => void;
}

/** Every toggle the editor toolbars offer, by name; `ToggleButtons` renders a list of them. */
export const toggles = {
	heading2: {
		label: m.heading2,
		icon: 'fa-heading',
		isActive: (editor) => editor.isActive('heading', { level: 2 }),
		toggle: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
	},
	heading3: {
		label: m.heading3,
		icon: 'fa-h',
		isActive: (editor) => editor.isActive('heading', { level: 3 }),
		toggle: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run()
	},
	bold: {
		label: m.bold,
		icon: 'fa-bold',
		isActive: (editor) => editor.isActive('bold'),
		toggle: (editor) => editor.chain().focus().toggleBold().run()
	},
	italic: {
		label: m.italic,
		icon: 'fa-italic',
		isActive: (editor) => editor.isActive('italic'),
		toggle: (editor) => editor.chain().focus().toggleItalic().run()
	},
	underline: {
		label: m.underline,
		icon: 'fa-underline',
		isActive: (editor) => editor.isActive('underline'),
		toggle: (editor) => editor.chain().focus().toggleUnderline().run()
	},
	superscript: {
		label: m.superscript,
		icon: 'fa-superscript',
		isActive: (editor) => editor.isActive('superscript'),
		toggle: (editor) => editor.chain().focus().toggleSuperscript().run()
	},
	subscript: {
		label: m.subscript,
		icon: 'fa-subscript',
		isActive: (editor) => editor.isActive('subscript'),
		toggle: (editor) => editor.chain().focus().toggleSubscript().run()
	},
	bulletList: {
		label: m.bulletList,
		icon: 'fa-list',
		isActive: (editor) => editor.isActive('bulletList'),
		toggle: (editor) => editor.chain().focus().toggleBulletList().run()
	},
	orderedList: {
		label: m.orderedList,
		icon: 'fa-list-ol',
		isActive: (editor) => editor.isActive('orderedList'),
		toggle: (editor) => editor.chain().focus().toggleOrderedList().run()
	},
	blockquote: {
		label: m.blockquote,
		icon: 'fa-quote-left',
		isActive: (editor) => editor.isActive('blockquote'),
		toggle: (editor) => editor.chain().focus().toggleBlockquote().run()
	}
} satisfies Record<string, Toggle>;

export type ToggleName = keyof typeof toggles;
