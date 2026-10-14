import { describe, expect, test } from 'vitest';
import {
	getEmptyTipTapDocument,
	getSafeTipTapContent,
	isEmptyTipTapDocument,
	isValidTipTapContent
} from './contentValidation';

describe('isValidTipTapContent', () => {
	test.each([
		[null, false],
		[undefined, false],
		['doc', false],
		[{}, false],
		[{ type: 3 }, false],
		[{ type: 'doc' }, true]
	])('%o -> %s', (content, valid) => {
		expect(isValidTipTapContent(content)).toBe(valid);
	});
});

describe('getSafeTipTapContent', () => {
	test('passes valid content through and drops the rest', () => {
		const doc = { type: 'doc', content: [] };
		expect(getSafeTipTapContent(doc)).toBe(doc);
		expect(getSafeTipTapContent({})).toBeUndefined();
	});
});

describe('isEmptyTipTapDocument', () => {
	test('an empty document', () => {
		expect(isEmptyTipTapDocument(getEmptyTipTapDocument())).toBe(true);
		expect(isEmptyTipTapDocument({ type: 'doc' })).toBe(true);
	});
	test('anything else', () => {
		expect(isEmptyTipTapDocument(undefined)).toBe(false);
		expect(isEmptyTipTapDocument({ type: 'paragraph' })).toBe(false);
		expect(isEmptyTipTapDocument({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe(false);
	});
});
