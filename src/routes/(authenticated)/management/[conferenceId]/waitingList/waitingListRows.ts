import { getAgeAtConference } from '$lib/helpers/ageChecker';

export interface WaitingListRow {
	id: string;
	userId: string;
	createdAt: Date;
	family_name: string;
	given_name: string;
	email: string;
	phone: string | null;
	conferenceAge: number | undefined;
	participationCount: number;
	city: string | null;
	school: string | null;
	motivation: string | null;
	experience: string | null;
	requests: string | null;
	hidden: boolean;
}

type Maybe<T> = T | null | undefined;

/** A waiting list entry as the page fetches it. */
export interface WaitingListSourceEntry {
	id: string;
	user: {
		id: string;
		givenName: string;
		familyName: string;
		email: string;
		phone?: Maybe<string>;
		city?: Maybe<string>;
		birthday?: Maybe<Date | string>;
		conferenceParticipationsCount: number;
	};
	school?: Maybe<string>;
	experience?: Maybe<string>;
	motivation?: Maybe<string>;
	requests?: Maybe<string>;
	hidden: boolean;
	createdAt: Date | string;
}

/** The entries the table shows: hidden ones only when asked to. */
export function visibleEntries<E extends { hidden: boolean }>(
	entries: readonly E[],
	filterHidden: boolean
): readonly E[] {
	return filterHidden ? entries.filter((e) => !e.hidden) : entries;
}

function conferenceAge(
	birthday: Maybe<Date | string>,
	startConference: Maybe<Date | string>
): number | undefined {
	if (!birthday || !startConference) return undefined;
	return getAgeAtConference(birthday, startConference);
}

/** One table row; `startConference` decides the age the person will be at the conference. */
export function toWaitingListRow(
	entry: WaitingListSourceEntry,
	startConference: Maybe<Date | string>
): WaitingListRow {
	const { user } = entry;
	return {
		id: entry.id,
		userId: user.id,
		createdAt: new Date(entry.createdAt),
		family_name: user.familyName,
		given_name: user.givenName,
		email: user.email,
		phone: user.phone ?? null,
		conferenceAge: conferenceAge(user.birthday, startConference),
		participationCount: user.conferenceParticipationsCount,
		city: user.city ?? null,
		school: entry.school ?? null,
		motivation: entry.motivation ?? null,
		experience: entry.experience ?? null,
		requests: entry.requests ?? null,
		hidden: entry.hidden
	};
}
