import { describe, expect, it } from 'vitest';
import { manualPaletteEntry, matchesManual } from './pageRegistry';

describe('manualPaletteEntry', () => {
	it('opens the manual section about the page on screen', () => {
		const entry = manualPaletteEntry(
			'/(authenticated)/dashboard/[conferenceId]/team/seat-planning'
		);
		expect(entry.href).toBe('/docs/user-manual/team/configuration#seat-planning');
	});

	it('opens the manual start page elsewhere', () => {
		expect(manualPaletteEntry(null).href).toBe('/docs/user-manual/introduction');
	});
});

describe('matchesManual', () => {
	it.each(['', '  ', 'hilfe', 'Handbuch', 'hand', 'help me', 'tour'])(
		'offers the manual for "%s"',
		(term) => {
			expect(matchesManual(term)).toBe(true);
		}
	);

	it.each(['h', 'ha', 'Müller', 'Delegation'])('does not for "%s"', (term) => {
		expect(matchesManual(term)).toBe(false);
	});
});
