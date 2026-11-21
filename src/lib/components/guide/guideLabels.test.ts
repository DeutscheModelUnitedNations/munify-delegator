import { expect, test } from 'vitest';
import { scopeLabel } from './guideLabels';
import { m } from '#lib/paraglide/messages';

test('scopeLabel names the scope with the series and year where known', () => {
	expect(scopeLabel({ kind: 'EVERYWHERE' })).toBe(m.guideScopeEverywhere());
	expect(scopeLabel({ kind: 'YEAR', year: 2027 })).toBe(m.guideScopeYearOf({ year: 2027 }));
	expect(scopeLabel({ kind: 'YEAR' })).toBe(m.guideScopeYear());
	expect(scopeLabel({ kind: 'SERIES', series: 'MUN-SH' })).toBe(
		m.guideScopeSeriesOf({ series: 'MUN-SH' })
	);
	expect(scopeLabel({ kind: 'SERIES' })).toBe(m.guideScopeSeries());
	expect(scopeLabel({ kind: 'CONFERENCE' })).toBe(m.guideScopeConference());
});
