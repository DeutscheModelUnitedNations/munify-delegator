import { db } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isTeamMemberOfConference,
	systemAdmin
} from '#api/services/authHelper/rules';
import { callerUserId } from '#api/services/authHelper/utils';
import {
	assertCanManageCalendarDay,
	calendarConference
} from '#api/handlers/calendarDay/calendarDayPermissions';
import { assertFindFirstExists } from '@m1212e/rumble';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

export function registerCalendarEntryAbilities() {
	abilityBuilder.calendarEntry.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Whoever reads the conference's schedule (`calendarConference`) reads its entries without survey
	// options...
	abilityBuilder.calendarEntry.allow('read').when((ctx) => {
		const conference = calendarConference(ctx);
		return conference
			? { where: { NOT: { surveyOptions: true }, calendarDay: { conference } } }
			: undefined;
	});

	// ...and those whose survey options include one they picked...
	abilityBuilder.calendarEntry.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		const conference = calendarConference(ctx);
		return id && conference
			? {
					where: {
						surveyOptions: { surveyAnswers: { participant: { userId: id } } },
						calendarDay: { conference }
					}
				}
			: undefined;
	});

	// ...and every team member reads all of their conference's entries.
	abilityBuilder.calendarEntry.allow('read').when((ctx) => {
		const calendarDay = isTeamMemberOfConference({ ctx });
		return calendarDay ? { where: { calendarDay } } : undefined;
	});

	// Participant care (project management and participant care) updates and deletes them.
	abilityBuilder.calendarEntry.allow(['update', 'delete']).when((ctx) => {
		const calendarDay = isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES });
		return calendarDay ? { where: { calendarDay } } : undefined;
	});
}

/**
 * Refuses (INVALID_INPUT) unless the day, place and survey options an entry names are the
 * conference's and the tracks are the day's, and a given track list is not empty. Otherwise a
 * conference's calendar could pull in another conference's venues, or move entries over to it.
 */
async function assertReferencesInConference({
	conferenceId,
	refs
}: {
	conferenceId: string;
	refs: {
		calendarDayId: string;
		calendarTrackIds?: readonly string[];
		placeId?: string | null;
		surveyOptionIds?: readonly string[] | null;
	};
}) {
	const trackIds = [...new Set(refs.calendarTrackIds ?? [])];
	if (refs.calendarTrackIds && trackIds.length === 0) {
		throw apiError({ code: 'INVALID_INPUT', message: m.calendarEntryNeedsTrack() });
	}
	const found = await Promise.all([
		db.query.calendarDay
			.findFirst({ where: { id: refs.calendarDayId, conferenceId }, columns: { id: true } })
			.then(Boolean),
		tracksOfDay({ calendarDayId: refs.calendarDayId, trackIds }),
		optionalReferenceFound({
			id: refs.placeId,
			find: (id) => db.query.place.findFirst({ where: { id, conferenceId }, columns: { id: true } })
		}),
		surveyOptionsOfConference({ conferenceId, optionIds: refs.surveyOptionIds ?? [] })
	]);
	if (found.includes(false)) {
		throw apiError({ code: 'INVALID_INPUT', message: m.calendarEntryOtherConference() });
	}
}

/** Whether `find` finds the row `id` names; naming none is fine. */
async function optionalReferenceFound({
	id,
	find
}: {
	id: string | null | undefined;
	find: (id: string) => Promise<unknown>;
}) {
	return !id || !!(await find(id));
}

/** Whether every one of `optionIds` is an option of a survey question of the conference. */
async function surveyOptionsOfConference({
	conferenceId,
	optionIds
}: {
	conferenceId: string;
	optionIds: readonly string[];
}) {
	const ids = [...new Set(optionIds)];
	if (ids.length === 0) return true;
	const options = await db.query.surveyOption.findMany({
		where: { id: { in: ids }, question: { conferenceId } },
		columns: { id: true }
	});
	return options.length === ids.length;
}

/** Whether every one of `trackIds` is a track running on the day. */
async function tracksOfDay({
	calendarDayId,
	trackIds
}: {
	calendarDayId: string;
	trackIds: string[];
}) {
	if (trackIds.length === 0) return true;
	const tracks = await db.query.calendarTrack.findMany({
		where: { id: { in: trackIds }, calendarDays: { id: calendarDayId } },
		columns: { id: true }
	});
	return tracks.length === trackIds.length;
}

/**
 * Refuses unless the caller holds `manageParticipants` (project management and participant care) in
 * the day's conference, and the tracks, place and survey options the entry names belong there.
 */
export async function assertCanCreateCalendarEntry({
	ctx,
	args
}: {
	ctx: ApiContext;
	args: {
		calendarDayId: string;
		calendarTrackIds?: readonly string[] | null;
		placeId?: string | null;
		surveyOptionIds?: readonly string[] | null;
	};
}) {
	const day = await assertCanManageCalendarDay({ ctx, calendarDayId: args.calendarDayId });
	await assertReferencesInConference({
		conferenceId: day.conferenceId,
		refs: {
			calendarDayId: args.calendarDayId,
			calendarTrackIds: args.calendarTrackIds ?? [],
			placeId: args.placeId,
			surveyOptionIds: args.surveyOptionIds
		}
	});
}

/**
 * Refuses unless the caller may update the entry (participant care of its conference), and the day,
 * tracks, place and survey options it is given belong to its conference.
 */
export async function assertCanUpdateCalendarEntry({
	ctx,
	args
}: {
	ctx: ApiContext;
	args: {
		id: string;
		calendarDayId?: string | null;
		calendarTrackIds?: readonly string[] | null;
		placeId?: string | null;
		surveyOptionIds?: readonly string[] | null;
	};
}) {
	const entry = await db.query.calendarEntry
		.findFirst({
			...(await ctx.abilities.calendarEntry.filter('update')).merge({ where: { id: args.id } })
				.query.single,
			columns: { calendarDayId: true },
			with: {
				calendarDay: { columns: { conferenceId: true } },
				tracks: { columns: { id: true } }
			}
		})
		.then(assertFindFirstExists);
	const calendarDayId = args.calendarDayId ?? entry.calendarDayId;
	await assertReferencesInConference({
		conferenceId: entry.calendarDay.conferenceId,
		refs: {
			calendarDayId,
			// Moving to another day takes the tracks along only if they are that day's too.
			calendarTrackIds: args.calendarTrackIds ?? entry.tracks.map((track) => track.id),
			placeId: args.placeId,
			surveyOptionIds: args.surveyOptionIds
		}
	});
}
