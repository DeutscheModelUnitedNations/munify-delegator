import { db } from '$api/db/db';
import { type ApiContext, abilityBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRoleForCalendarDay,
	isTeamMemberOfConference,
	systemAdmin
} from '$api/services/authHelper';
import { assertFindFirstExists } from '@m1212e/rumble';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '$api/services/errors/apiError';

export function registerCalendarEntryAbilities() {
	// Ported from abilities/entities/calendarEntry.ts
	abilityBuilder.calendarEntry.allow('read');
	abilityBuilder.calendarEntry.allow(['update', 'delete']).when(systemAdmin);

	abilityBuilder.calendarEntry.allow(['update', 'delete']).when((ctx) => {
		const calendarDay = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
		return calendarDay ? { where: { calendarDay } } : undefined;
	});
}

/**
 * An entry's day, track and place are ids from the client, so each has to belong where the entry
 * does: the track to the entry's day, the place and the day to the entry's conference. Otherwise a
 * conference's calendar could pull in another conference's venues, or move entries over to it.
 */
async function assertReferences(
	conferenceId: string,
	refs: { calendarDayId: string; calendarTrackIds?: readonly string[]; placeId?: string | null }
) {
	const trackIds = [...new Set(refs.calendarTrackIds ?? [])];
	if (refs.calendarTrackIds && trackIds.length === 0) {
		throw apiError('INVALID_INPUT', m.calendarEntryNeedsTrack());
	}
	const [day, tracks, place] = await Promise.all([
		db.query.calendarDay.findFirst({
			where: { id: refs.calendarDayId, conferenceId },
			columns: { id: true }
		}),
		trackIds.length > 0
			? db.query.calendarTrack.findMany({
					where: { id: { in: trackIds }, calendarDayId: refs.calendarDayId },
					columns: { id: true }
				})
			: [],
		refs.placeId
			? db.query.place.findFirst({
					where: { id: refs.placeId, conferenceId },
					columns: { id: true }
				})
			: true
	]);
	if (!day || tracks.length !== trackIds.length || !place) {
		throw apiError('INVALID_INPUT', m.calendarEntryOtherConference());
	}
}

/** Refuses unless the caller may add the entry to the day, with the tracks and place it names. */
export async function assertCanCreateCalendarEntry(
	ctx: ApiContext,
	args: {
		calendarDayId: string;
		calendarTrackIds?: readonly string[] | null;
		placeId?: string | null;
	}
) {
	const day = await assertTeamRoleForCalendarDay(ctx, args.calendarDayId);
	await assertReferences(day.conferenceId, {
		calendarDayId: args.calendarDayId,
		calendarTrackIds: args.calendarTrackIds ?? [],
		placeId: args.placeId
	});
}

/**
 * Refuses unless the caller may update the entry, and the day, tracks and place it is given belong
 * to its conference.
 */
export async function assertCanUpdateCalendarEntry(
	ctx: ApiContext,
	args: {
		id: string;
		calendarDayId?: string | null;
		calendarTrackIds?: readonly string[] | null;
		placeId?: string | null;
	}
) {
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
	await assertReferences(entry.calendarDay.conferenceId, {
		calendarDayId,
		// Moving to another day takes the tracks along only if they are that day's too.
		calendarTrackIds: args.calendarTrackIds ?? entry.tracks.map((track) => track.id),
		placeId: args.placeId
	});
}

/** The entry `id`, if the caller may delete it: a where clause matching nothing otherwise. */
export async function deletableCalendarEntryWhere(ctx: ApiContext, id: string) {
	return (await ctx.abilities.calendarEntry.filter('delete')).merge({ where: { id } }).sql.where;
}
