import { entriesForSeat, seatOf } from '#lib/components/calendar/calendarNow';
import type { IcsEvent } from './icsCalendar';

type IdRef = { id: string };

/** An entry with what `entriesForSeat` follows: its tracks and place. */
type FeedEntry = Omit<IcsEvent, 'place'> & {
	tracks: IdRef[];
	place: (NonNullable<IcsEvent['place']> & IdRef) | null;
};

/** What decides a person's calendar: the schedule they read and their seat in the conference. */
export interface FeedSchedule {
	calendarDays: readonly {
		tracks: readonly {
			id: string;
			committees: readonly IdRef[];
			conferenceRoles: readonly IdRef[];
		}[];
		entries: readonly FeedEntry[];
	}[];
	delegationMembers: readonly {
		assignedCommittee: IdRef | null;
		delegation: { assignedRole: IdRef | null };
	}[];
	singleParticipants: readonly { assignedRole: IdRef | null }[];
}

/**
 * The entries a person's calendar gets: those for their committee's or role's tracks and the shared
 * ones, or every entry once when no track is for their seat (`entriesForSeat`, as the dashboard's
 * next entries). Ordered by id, so parallel copies merge into the same event on every fetch.
 */
export function feedEvents(schedule: FeedSchedule): IcsEvent[] {
	const seat = seatOf({
		delegationMember: schedule.delegationMembers.at(0),
		singleParticipant: schedule.singleParticipants.at(0)
	});
	const days = schedule.calendarDays.map((day) => ({
		tracks: day.tracks,
		entries: day.entries.toSorted((a, b) => a.id.localeCompare(b.id))
	}));
	return entriesForSeat<FeedEntry>({ days, seat });
}
