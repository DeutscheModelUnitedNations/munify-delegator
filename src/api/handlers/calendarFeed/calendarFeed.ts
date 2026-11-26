import { schemaBuilder, type ApiContext } from '#api/rumble';
import { assertCanHaveCalendarFeed } from './calendarFeedPermissions';
import { ensureCalendarFeed, resetCalendarFeed } from './calendarFeedService';
import { calendarFeedToken } from './calendarFeedToken';

/** The subscription link of a feed: served by `src/routes/calendar/[token].ics`. */
function feedUrl({ origin, feedId }: { origin: string; feedId: string }) {
	return new URL(`/calendar/${calendarFeedToken(feedId)}.ics`, origin).href;
}

/** The caller's link after `write` made or replaced their feed (`ensureCalendarFeed`, `resetCalendarFeed`). */
async function callerFeedUrl({
	ctx,
	conferenceId,
	write
}: {
	ctx: ApiContext;
	conferenceId: string;
	write: typeof ensureCalendarFeed;
}) {
	const { userId } = await assertCanHaveCalendarFeed({ ctx, conferenceId });
	const feedId = await write({ userId, conferenceId });
	return feedUrl({ origin: ctx.requestUrl().origin, feedId });
}

const feedDescription =
	'Calendar apps subscribe to it without signing in, so it is secret: whoever has it reads the schedule as the caller does. For the caller acting for themselves (FORBIDDEN while impersonating) in a conference whose schedule they read (NOT_FOUND otherwise).';

schemaBuilder.mutationFields((t) => ({
	calendarFeedUrl: t.string({
		description: `The caller's subscription link to the conference's schedule (an iCalendar feed), made on first use. ${feedDescription}`,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: (_root, args, ctx) =>
			callerFeedUrl({ ctx, conferenceId: args.conferenceId, write: ensureCalendarFeed })
	}),

	resetCalendarFeedUrl: t.string({
		description: `Replaces the caller's subscription link to the conference's schedule with a new one; the old one stops working. ${feedDescription}`,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: (_root, args, ctx) =>
			callerFeedUrl({ ctx, conferenceId: args.conferenceId, write: resetCalendarFeed })
	})
}));
