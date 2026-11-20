import { m } from '#lib/paraglide/messages';
import type { GuideScopeKind } from '#lib/guide/scope';

/** What a scope is called, seen from a conference of `series` starting in `year`. */
export function scopeLabel({
	kind,
	series,
	year
}: {
	kind: GuideScopeKind;
	series?: string | null;
	year?: number;
}) {
	switch (kind) {
		case 'EVERYWHERE':
			return m.guideScopeEverywhere();
		case 'YEAR':
			return year ? m.guideScopeYearOf({ year }) : m.guideScopeYear();
		case 'SERIES':
			return series ? m.guideScopeSeriesOf({ series }) : m.guideScopeSeries();
		case 'CONFERENCE':
			return m.guideScopeConference();
	}
}

/** The badge colour of a scope: the wider it reaches, the louder. */
export const SCOPE_BADGE: Record<GuideScopeKind, string> = {
	EVERYWHERE: 'badge-primary',
	YEAR: 'badge-secondary',
	SERIES: 'badge-accent',
	CONFERENCE: 'badge-neutral'
};
