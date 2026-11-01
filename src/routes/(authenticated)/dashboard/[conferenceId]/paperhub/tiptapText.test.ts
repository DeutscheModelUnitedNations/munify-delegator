import { describe, expect, test } from 'vitest';
import { hasTextContent } from './tiptapText';

describe('hasTextContent', () => {
	test('is false for nothing and for empty documents', () => {
		expect(hasTextContent(null)).toBe(false);
		expect(hasTextContent(undefined)).toBe(false);
		expect(hasTextContent({ type: 'doc' })).toBe(false);
		expect(hasTextContent({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe(false);
	});

	test('ignores whitespace-only text', () => {
		expect(
			hasTextContent({
				type: 'doc',
				content: [{ type: 'paragraph', content: [{ type: 'text', text: '  \n' }] }]
			})
		).toBe(false);
		expect(hasTextContent({ type: 'text' })).toBe(false);
	});

	test('finds text nested anywhere', () => {
		expect(
			hasTextContent({
				type: 'doc',
				content: [
					{ type: 'paragraph' },
					{
						type: 'bulletList',
						content: [{ type: 'listItem', content: [{ type: 'text', text: 'Hi' }] }]
					}
				]
			})
		).toBe(true);
	});
});
