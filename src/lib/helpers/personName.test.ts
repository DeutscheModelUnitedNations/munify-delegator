import { describe, expect, it } from 'vitest';
import { isPersonName } from './personName';

describe('isPersonName', () => {
	it('accepts names from any script and the usual separators', () => {
		for (const name of ['Anne-Marie', "O'Brien", 'J.R.R. Tolkien', 'José Núñez', '李小龙', 'Ölçer'])
			expect(isPersonName(name)).toBe(true);
	});

	it('accepts what the scalar corrects on its own', () => {
		expect(isPersonName('  Anne – Marie ')).toBe(true);
		expect(isPersonName('O’Brien')).toBe(true);
	});

	it('rejects digits, symbols and empty names', () => {
		for (const name of ['', '   ', 'X Æ A-12', 'Max!', 'Max_Mustermann']) {
			expect(isPersonName(name)).toBe(false);
		}
	});
});
