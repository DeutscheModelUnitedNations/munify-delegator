import { db } from '#api/db/db';
import type { ApiContext } from '#api/rumble';
import { hasPartIn } from '#api/services/authHelper/rules';
import { callerFacts } from '#api/services/authHelper/callerFacts';
import { callerAsThemselves } from '#api/services/authHelper/utils';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';

/**
 * Refuses unless the caller acts for themselves (FORBIDDEN while impersonating or over MCP: the
 * link would outlive the session and read as the person) and reads the conference's schedule
 * (NOT_FOUND): on its team, or taking part once the schedule is shown. Returns the caller's id,
 * whose feed it is. The feed itself reads through the schedule's rules on every fetch, so a link
 * shows nothing more once its owner no longer takes part.
 */
export async function assertCanHaveCalendarFeed({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	ctx.mustBeLoggedIn();
	const userId = callerAsThemselves(ctx);
	if (!userId) throw apiError({ code: 'FORBIDDEN', message: m.calendarFeedOnlyForYourself() });

	const partIn = hasPartIn({
		ctx,
		facts: await callerFacts(ctx),
		asParticipant: (conference) => conference.showCalendar
	});
	const conference =
		partIn &&
		(await db.query.conference.findFirst({
			where: { ...partIn, id: conferenceId },
			columns: { id: true }
		}));
	if (!conference) throw apiError({ code: 'NOT_FOUND', message: m.calendarNotFound() });
	return { userId };
}
