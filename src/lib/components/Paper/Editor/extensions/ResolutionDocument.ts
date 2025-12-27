import Document from '@tiptap/extension-document';
import { mergeAttributes } from '@tiptap/core';

export const ResolutionDocument = Document.extend({
	// We restrict the root document to specifically contain our sections
	content: 'resolutionHeader preambleSection operativeSection'
});
