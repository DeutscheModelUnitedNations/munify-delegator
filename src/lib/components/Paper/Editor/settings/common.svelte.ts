import Document from '@tiptap/extension-document';
import Paragraph, { type ParagraphOptions } from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { type EditorOptions, type Node, type Mark, type Extension } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Underline from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import HardBreak from '@tiptap/extension-hard-break';

export const getCommonSettings: (element: Element, editable: boolean) => Partial<EditorOptions> = (
	element,
	editable
) => ({
	element,
	editable
});

export const getCommonExtensions: () => (Node | Mark | Extension)[] = () => [
	Document,
	Paragraph,
	Text,
	Bold,
	Italic,
	Underline,
	Superscript,
	Subscript,
	CharacterCount,
	HardBreak
];
