import { getAgeAtConference } from '#lib/helpers/ageChecker.js';

export interface WaitingListRow {
	id: string;
	userId: string;
	createdAt: Date;
	/** The place on the list among those still waiting; none once seated or hidden. */
	position: number | undefined;
	/** When the entrant was given a seat. */
	assignedAt: Date | null;
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
	school?: Maybe<{ name: string }>;
	experience?: Maybe<string>;
	motivation?: Maybe<string>;
	requests?: Maybe<string>;
	hidden: boolean;
	assignedAt?: Maybe<Date | string>;
	createdAt: Date | string;
}

function conferenceAge(
	birthday: Maybe<Date | string>,
	startConference: Maybe<Date | string>
): number | undefined {
	if (!birthday || !startConference) return undefined;
	return getAgeAtConference(birthday, startConference);
}

/**
 * One table row; `startConference` decides the age the person will be at the conference, and
 * `positions` (entry id to place, `waitingListPositions`) the place on the list.
 */
export function toWaitingListRow(
	entry: WaitingListSourceEntry,
	startConference: Maybe<Date | string>,
	positions: ReadonlyMap<string, number> = new Map()
): WaitingListRow {
	const { user } = entry;
	return {
		id: entry.id,
		userId: user.id,
		createdAt: new Date(entry.createdAt),
		position: positions.get(entry.id),
		assignedAt: entry.assignedAt ? new Date(entry.assignedAt) : null,
		family_name: user.familyName,
		given_name: user.givenName,
		email: user.email,
		phone: user.phone ?? null,
		conferenceAge: conferenceAge(user.birthday, startConference),
		participationCount: user.conferenceParticipationsCount,
		city: user.city ?? null,
		school: entry.school?.name ?? null,
		motivation: entry.motivation ?? null,
		experience: entry.experience ?? null,
		requests: entry.requests ?? null,
		hidden: entry.hidden
	};
}

/** Places on the list, 1 for the first, from the entries still waiting in list order. */
export function waitingListPositions(waiting: readonly { id: string }[]) {
	return new Map(waiting.map((entry, index) => [entry.id, index + 1]));
}
