/**
 * Where a guide page is shared (`docs/plans/guide.md`): everywhere (every series, every year), in
 * one year (every series), in one series (every year), or in one conference. Shared scopes reach
 * only conferences with a series, never another organizer's.
 */

export const GUIDE_SCOPE_KINDS = ['EVERYWHERE', 'YEAR', 'SERIES', 'CONFERENCE'] as const;
export type GuideScopeKind = (typeof GUIDE_SCOPE_KINDS)[number];

/** A scope as the columns hold it: at most one of the three is set. */
export type GuideScope = {
	seriesId: string | null;
	year: number | null;
	conferenceId: string | null;
};

/** What a scope is compared with: a conference, its series and its year (`conferenceYear`). */
export type ScopeTarget = { id: string; seriesId: string | null; year: number };

export const EVERYWHERE: GuideScope = { seriesId: null, year: null, conferenceId: null };

/** Which of the four modes the scope is. */
export function scopeKindOf(scope: GuideScope): GuideScopeKind {
	if (scope.conferenceId !== null) return 'CONFERENCE';
	if (scope.seriesId !== null) return 'SERIES';
	if (scope.year !== null) return 'YEAR';
	return 'EVERYWHERE';
}

/** The scope of `kind` that reaches `conference`. */
export function scopeFor({
	kind,
	conference
}: {
	kind: GuideScopeKind;
	conference: ScopeTarget;
}): GuideScope {
	switch (kind) {
		case 'EVERYWHERE':
			return EVERYWHERE;
		case 'YEAR':
			return { ...EVERYWHERE, year: conference.year };
		case 'SERIES':
			return { ...EVERYWHERE, seriesId: conference.seriesId };
		case 'CONFERENCE':
			return { ...EVERYWHERE, conferenceId: conference.id };
	}
}

/** Whether a page of `scope` reaches `conference`. */
export function scopeReaches({
	scope,
	conference
}: {
	scope: GuideScope;
	conference: ScopeTarget;
}) {
	if (scope.conferenceId !== null) return scope.conferenceId === conference.id;
	// shared scopes reach only conferences of a series
	if (conference.seriesId === null) return false;
	if (scope.seriesId !== null && scope.seriesId !== conference.seriesId) return false;
	if (scope.year !== null && scope.year !== conference.year) return false;
	return true;
}

/** Whether two scopes are the same. */
export function sameScope(a: GuideScope, b: GuideScope) {
	return a.seriesId === b.seriesId && a.year === b.year && a.conferenceId === b.conferenceId;
}

/** The calendar year a conference starts in, in its own time zone. */
export function conferenceYear({ start, timezone }: { start: Date; timezone: string }) {
	const year = new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: timezone })
		.formatToParts(start)
		.find((part) => part.type === 'year')?.value;
	return year ? Number(year) : start.getUTCFullYear();
}

/** What the scope labels of a conference need: its series' name and the year it starts in. */
export function scopeContextOf(conference: {
	startConference: Date | string;
	timezone: string;
	series?: { name: string } | null;
}) {
	return {
		year: conferenceYear({
			start: new Date(conference.startConference),
			timezone: conference.timezone
		}),
		seriesName: conference.series?.name ?? null
	};
}
