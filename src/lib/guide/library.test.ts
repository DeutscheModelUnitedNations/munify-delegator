import { describe, expect, test } from 'vitest';
import { guidePageState } from './library';

describe('guidePageState', () => {
	test('a page never published is a draft', () => {
		expect(guidePageState({ publishedAt: null, draftUpdatedAt: '2026-01-01' })).toBe('DRAFT');
	});

	test('a draft changed after the publish has changes', () => {
		expect(
			guidePageState({ publishedAt: '2026-01-01T10:00Z', draftUpdatedAt: '2026-01-01T11:00Z' })
		).toBe('CHANGED');
		expect(
			guidePageState({ publishedAt: '2026-01-01T12:00Z', draftUpdatedAt: '2026-01-01T11:00Z' })
		).toBe('PUBLISHED');
	});
});
