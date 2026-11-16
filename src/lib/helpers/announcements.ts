import { z } from 'zod';
import { m } from '#lib/paraglide/messages';

/**
 * The rules of the conference's announcements, shared by the API (who reads and who is mailed
 * which announcement) and the pages (the editor's audience picker, the feed).
 */

/** Who an announcement can be for (`announcement_audience_kind`). */
export const AUDIENCE_KINDS = [
	'EVERYONE',
	'DELEGATES',
	'SINGLE_PARTICIPANTS',
	'SUPERVISORS',
	'APPLICANTS',
	'SEATED',
	'WAITING_LIST',
	'TEAM',
	'COMMITTEE',
	'ROLE',
	'SURVEY_OPTION',
	'PAYMENT_OPEN',
	'PAPERWORK_OPEN',
	'MINORS',
	'ADULTS'
] as const;
export type AudienceKind = (typeof AUDIENCE_KINDS)[number];

export const TEAM_ROLES = [
	'MEMBER',
	'REVIEWER',
	'PARTICIPANT_CARE',
	'TEAM_COORDINATOR',
	'CONTENT_LEAD',
	'PROJECT_MANAGEMENT'
] as const;
export type AudienceTeamRole = (typeof TEAM_ROLES)[number];

/** The kinds that name something: a committee, a role or a survey option. */
const TARGET_OF = {
	COMMITTEE: 'committeeId',
	ROLE: 'roleId',
	SURVEY_OPTION: 'surveyOptionId'
} as const satisfies Partial<Record<AudienceKind, string>>;

/** One block of an announcement's audience. */
export interface Audience {
	kind: AudienceKind;
	committeeId?: string | null;
	roleId?: string | null;
	surveyOptionId?: string | null;
	/** `TEAM` only: that role instead of the whole team. */
	teamRole?: AudienceTeamRole | null;
}

/** How a person takes part in the conference: every person has exactly one part. */
export type AudiencePart = 'DELEGATE' | 'SINGLE' | 'SUPERVISOR' | 'WAITING_LIST' | 'TEAM';

/**
 * What the audiences ask about a person. Everything about a seat (`seated`, `committeeId`,
 * `roleId`, the open paperwork) is only filled in once the conference released its assignment, so
 * an announcement cannot tell anybody their seat early.
 */
export interface AudienceSubject {
	part: AudiencePart;
	/**
	 * In the `EVERYONE` audience: every participant and everybody waiting until the conference
	 * prepares with its assignment released, from then on only who has a part in it (a seat, or a
	 * student who has one).
	 */
	everyone: boolean;
	/** Holds a seat, or supervises someone who does and comes along. */
	seated: boolean;
	committeeId: string | null;
	roleId: string | null;
	surveyOptionIds: readonly string[];
	paymentOpen: boolean;
	paperworkOpen: boolean;
	/** Of age on the first day of the conference; `null` without a birthday. */
	ofAge: boolean | null;
	teamRoles: readonly AudienceTeamRole[];
}

const MATCHES: Record<AudienceKind, (subject: AudienceSubject, audience: Audience) => boolean> = {
	EVERYONE: ({ everyone }) => everyone,
	DELEGATES: ({ part }) => part === 'DELEGATE',
	SINGLE_PARTICIPANTS: ({ part }) => part === 'SINGLE',
	SUPERVISORS: ({ part }) => part === 'SUPERVISOR',
	APPLICANTS: ({ part, seated }) => (part === 'DELEGATE' || part === 'SINGLE') && !seated,
	SEATED: ({ seated }) => seated,
	WAITING_LIST: ({ part }) => part === 'WAITING_LIST',
	// handled before the participants' kinds
	TEAM: () => false,
	COMMITTEE: ({ committeeId }, audience) => !!committeeId && committeeId === audience.committeeId,
	ROLE: ({ roleId }, audience) => !!roleId && roleId === audience.roleId,
	SURVEY_OPTION: ({ surveyOptionIds }, audience) =>
		!!audience.surveyOptionId && surveyOptionIds.includes(audience.surveyOptionId),
	PAYMENT_OPEN: ({ paymentOpen }) => paymentOpen,
	PAPERWORK_OPEN: ({ paperworkOpen }) => paperworkOpen,
	MINORS: ({ ofAge }) => ofAge === false,
	ADULTS: ({ ofAge }) => ofAge === true
};

/** Whether the person is in this block. The team is only ever in a `TEAM` block. */
export function audienceMatches({
	subject,
	audience
}: {
	subject: AudienceSubject;
	audience: Audience;
}) {
	if (audience.kind === 'TEAM')
		return (
			subject.part === 'TEAM' &&
			(!audience.teamRole || subject.teamRoles.includes(audience.teamRole))
		);
	if (subject.part === 'TEAM') return false;
	return MATCHES[audience.kind](subject, audience);
}

/** Whether the person is in the audience: in any one of its blocks. */
export function inAudience({
	subject,
	audiences
}: {
	subject: AudienceSubject;
	audiences: readonly Audience[];
}) {
	return audiences.some((audience) => audienceMatches({ subject, audience }));
}

/** The key telling two blocks apart, so one is not picked twice. */
export function audienceKey(audience: Audience) {
	const target =
		audience.kind === 'TEAM'
			? audience.teamRole
			: audience.kind in TARGET_OF
				? (audience.committeeId ?? audience.roleId ?? audience.surveyOptionId)
				: null;
	return target ? `${audience.kind}:${target}` : audience.kind;
}

/** The blocks without doubles, each reduced to what its kind uses. */
export function normalizeAudiences(audiences: readonly Audience[]): Audience[] {
	const seen = new Map<string, Audience>();
	for (const audience of audiences) {
		const { kind } = audience;
		const clean: Audience = {
			kind,
			committeeId: kind === 'COMMITTEE' ? audience.committeeId : null,
			roleId: kind === 'ROLE' ? audience.roleId : null,
			surveyOptionId: kind === 'SURVEY_OPTION' ? audience.surveyOptionId : null,
			teamRole: kind === 'TEAM' ? (audience.teamRole ?? null) : null
		};
		seen.set(audienceKey(clean), clean);
	}
	return [...seen.values()];
}

/** A block as the API takes it: only what its kind uses. */
export function audienceInput(audience: Audience) {
	return {
		kind: audience.kind,
		committeeId: audience.committeeId ?? undefined,
		roleId: audience.roleId ?? undefined,
		surveyOptionId: audience.surveyOptionId ?? undefined,
		teamRole: audience.teamRole ?? undefined
	};
}

/** A block names what its kind is about: a committee, a role or a survey option. */
export const audienceSchema = z
	.object({
		kind: z.enum(AUDIENCE_KINDS),
		committeeId: z.string().nullish(),
		roleId: z.string().nullish(),
		surveyOptionId: z.string().nullish(),
		teamRole: z.enum(TEAM_ROLES).nullish()
	})
	.refine(
		(audience) => {
			if (audience.kind === 'COMMITTEE') return !!audience.committeeId;
			if (audience.kind === 'ROLE') return !!audience.roleId;
			if (audience.kind === 'SURVEY_OPTION') return !!audience.surveyOptionId;
			return true;
		},
		{ error: () => m.announcementAudienceIncomplete() }
	);

export const MAX_ANNOUNCEMENT_TITLE = 120;
export const MAX_ANNOUNCEMENT_BODY = 10_000;
export const MAX_ANNOUNCEMENT_SIGNATURE = 120;
export const MAX_ANNOUNCEMENT_ATTACHMENTS = 5;

/** What an announcement says, as the editor and the API check it. */
export const announcementTextSchema = {
	title: z
		.string()
		.trim()
		.min(1, { error: () => m.announcementTitleRequired() })
		.max(MAX_ANNOUNCEMENT_TITLE, {
			error: () => m.announcementTooLong({ max: MAX_ANNOUNCEMENT_TITLE })
		}),
	body: z
		.string()
		.trim()
		.min(1, { error: () => m.announcementBodyRequired() })
		.max(MAX_ANNOUNCEMENT_BODY, {
			error: () => m.announcementTooLong({ max: MAX_ANNOUNCEMENT_BODY })
		}),
	signature: z
		.string()
		.trim()
		.max(MAX_ANNOUNCEMENT_SIGNATURE, {
			error: () => m.announcementTooLong({ max: MAX_ANNOUNCEMENT_SIGNATURE })
		})
};

type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type AnnouncementImportance = 'NORMAL' | 'IMPORTANT' | 'URGENT';

/** Where an announcement is in its life, as the team sees it. */
export type AnnouncementState = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'EXPIRED' | 'ARCHIVED';

interface Lifecycle {
	status: AnnouncementStatus;
	publishAt: Date | null;
	visibleUntil: Date | null;
}

/** A published announcement is scheduled until its time has come and expired once it is over. */
export function announcementState({
	announcement,
	now
}: {
	announcement: Lifecycle;
	now: Date;
}): AnnouncementState {
	const { status, publishAt, visibleUntil } = announcement;
	if (status !== 'PUBLISHED') return status;
	if (visibleUntil && visibleUntil.getTime() <= now.getTime()) return 'EXPIRED';
	if (!publishAt || publishAt.getTime() > now.getTime()) return 'SCHEDULED';
	return 'PUBLISHED';
}

/** Whether its audience reads the announcement right now. */
export const isOut = (args: { announcement: Lifecycle; now: Date }) =>
	announcementState(args) === 'PUBLISHED';

/** For how long after its publication (or a "notify again") an announcement's mail is owed. */
export const ANNOUNCEMENT_MAIL_HOURS = 24;

/**
 * Whether the announcement owes its audience a mail right now: while it is out, for
 * `ANNOUNCEMENT_MAIL_HOURS` from its publication or the last "notify again". So whoever is in the
 * audience then is told, and somebody who joins it weeks later only finds it on the dashboard.
 */
export function owesMail({
	announcement,
	now
}: {
	announcement: Lifecycle & { notifyByMail: boolean; mailSince: Date | null };
	now: Date;
}) {
	const { notifyByMail, mailSince } = announcement;
	if (!notifyByMail || !mailSince || !isOut({ announcement, now })) return false;
	const waited = now.getTime() - mailSince.getTime();
	return waited >= 0 && waited < ANNOUNCEMENT_MAIL_HOURS * 60 * 60 * 1000;
}

const IMPORTANCE_RANK: Record<AnnouncementImportance, number> = {
	URGENT: 0,
	IMPORTANT: 1,
	NORMAL: 2
};

interface FeedOrder {
	pinned: boolean;
	importance: AnnouncementImportance;
	publishAt: Date | string | null;
}

const time = (value: Date | string | null) => (value ? new Date(value).getTime() : 0);

/** The feed's order: pinned ones first, then the urgent, then the newest. */
export function compareFeed(a: FeedOrder, b: FeedOrder) {
	return (
		Number(b.pinned) - Number(a.pinned) ||
		Number(b.importance === 'URGENT') - Number(a.importance === 'URGENT') ||
		time(b.publishAt) - time(a.publishAt) ||
		IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance]
	);
}

/** The unread urgent announcement the bar across the conference's pages shows: the newest. */
export function urgentUnread<
	T extends { importance: AnnouncementImportance; read: boolean; publishAt: Date | string | null }
>(feed: readonly T[]): T | undefined {
	return feed
		.filter((item) => item.importance === 'URGENT' && !item.read)
		.toSorted((a, b) => time(b.publishAt) - time(a.publishAt))[0];
}

/**
 * What the dashboard shows of a feed: everything pinned or unread, filled up with the newest to
 * `limit`. The rest waits on the announcements page.
 */
export function dashboardFeed<T extends { pinned: boolean; read: boolean }>({
	feed,
	limit = 3
}: {
	feed: readonly T[];
	limit?: number;
}): T[] {
	const always = feed.filter((item) => item.pinned || !item.read);
	const room = Math.max(0, limit - always.length);
	const fill = new Set(feed.filter((item) => !always.includes(item)).slice(0, room));
	// in the feed's own order
	return feed.filter((item) => always.includes(item) || fill.has(item));
}
