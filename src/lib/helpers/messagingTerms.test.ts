import { describe, expect, test } from 'vitest';
import { allSectionsConfirmed, confirmSection, nextOpenSection } from './messagingTerms';

const keys = ['purpose', 'respect', 'readers'];

describe('nextOpenSection', () => {
	test('the first section not confirmed yet, in order', () => {
		expect(nextOpenSection({ keys, done: [] })).toBe('purpose');
		expect(nextOpenSection({ keys, done: ['purpose', 'readers'] })).toBe('respect');
	});

	test('none once every section is confirmed', () => {
		expect(nextOpenSection({ keys, done: keys })).toBeNull();
	});
});

describe('confirmSection', () => {
	test('marks the section and opens the next one left', () => {
		expect(confirmSection({ keys, done: [], key: 'purpose' })).toEqual({
			done: ['purpose'],
			open: 'respect'
		});
	});

	test('a section confirmed out of order sends the reader back to the first one left', () => {
		expect(confirmSection({ keys, done: [], key: 'readers' })).toEqual({
			done: ['readers'],
			open: 'purpose'
		});
	});

	test('confirming twice changes nothing, and the last one closes the list', () => {
		expect(confirmSection({ keys, done: ['purpose'], key: 'purpose' }).done).toEqual(['purpose']);
		expect(confirmSection({ keys, done: ['purpose', 'respect'], key: 'readers' })).toEqual({
			done: keys,
			open: null
		});
	});
});

describe('allSectionsConfirmed', () => {
	test('only with every section', () => {
		expect(allSectionsConfirmed({ keys, done: ['purpose', 'respect'] })).toBe(false);
		expect(allSectionsConfirmed({ keys, done: ['readers', 'respect', 'purpose'] })).toBe(true);
	});
});
