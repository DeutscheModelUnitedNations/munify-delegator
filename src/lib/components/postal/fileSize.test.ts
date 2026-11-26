import { expect, test } from 'vitest';
import { formatFileSize } from './fileSize';

test('formatFileSize', () => {
	expect(formatFileSize({ bytes: 12, locale: 'en' })).toBe('1 kB');
	expect(formatFileSize({ bytes: 340_400, locale: 'en' })).toBe('340 kB');
	expect(formatFileSize({ bytes: 1_240_000, locale: 'de' })).toBe('1,2 MB');
});
