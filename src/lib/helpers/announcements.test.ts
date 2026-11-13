import { describe, expect, test } from 'vitest';
import * as schema from '#api/db/schema/index';
import {
	announcementState,
	AUDIENCE_KINDS,
	audienceInput,
	audienceMatches,
	audienceSchema,
	compareFeed,
	dashboardFeed,
	inAudience,
	normalizeAudiences,
	owesMail,
	TEAM_ROLES,
	urgentUnread,
	type Audience,
	type AudienceSubject
} from './announcements';

const subject = (overrides: Partial<AudienceSubject> = {}): AudienceSubject => ({
	part: 'DELEGATE',
	seated: false,
	committeeId: null,
	roleId: null,
	surveyOptionIds: [],
	paymentOpen: false,
	paperworkOpen: false,
	ofAge: true,
	teamRoles: [],
	...overrides
});

const matches = (audience: Audience, overrides: Partial<AudienceSubject> = {}) =>
	audienceMatches({ subject: subject(overrides), audience });

describe('the lists', () => {
	test('name the same kinds and team roles as the database', () => {
		expect([...AUDIENCE_KINDS]).toEqual(schema.announcementAudienceKind.enumValues);
		expect([...TEAM_ROLES].toSorted()).toEqual([...schema.teamRole.enumValues].toSorted());
	});
});

describe('audienceMatches', () => {
	test('everyone is every participant, never the team', () => {
		for (const part of ['DELEGATE', 'SINGLE', 'SUPERVISOR', 'WAITING_LIST'] as const)
			expect(matches({ kind: 'EVERYONE' }, { part })).toBe(true);
		expect(matches({ kind: 'EVERYONE' }, { part: 'TEAM', teamRoles: ['MEMBER'] })).toBe(false);
	});

	test('the kinds of participants', () => {
		expect(matches({ kind: 'DELEGATES' })).toBe(true);
		expect(matches({ kind: 'DELEGATES' }, { part: 'SINGLE' })).toBe(false);
		expect(matches({ kind: 'SINGLE_PARTICIPANTS' }, { part: 'SINGLE' })).toBe(true);
		expect(matches({ kind: 'SUPERVISORS' }, { part: 'SUPERVISOR' })).toBe(true);
		expect(matches({ kind: 'SUPERVISORS' })).toBe(false);
		expect(matches({ kind: 'WAITING_LIST' }, { part: 'WAITING_LIST' })).toBe(true);
	});

	test('applicants are delegates and single participants without a seat', () => {
		expect(matches({ kind: 'APPLICANTS' })).toBe(true);
		expect(matches({ kind: 'APPLICANTS' }, { seated: true })).toBe(false);
		expect(matches({ kind: 'APPLICANTS' }, { part: 'SUPERVISOR' })).toBe(false);
		expect(matches({ kind: 'SEATED' }, { seated: true })).toBe(true);
		expect(matches({ kind: 'SEATED' })).toBe(false);
	});

	test('a committee, a role and a survey option match by id', () => {
		expect(matches({ kind: 'COMMITTEE', committeeId: 'ga' }, { committeeId: 'ga' })).toBe(true);
		expect(matches({ kind: 'COMMITTEE', committeeId: 'ga' }, { committeeId: 'sc' })).toBe(false);
		expect(matches({ kind: 'COMMITTEE', committeeId: 'ga' })).toBe(false);
		expect(matches({ kind: 'ROLE', roleId: 'fra' }, { roleId: 'fra' })).toBe(true);
		expect(matches({ kind: 'ROLE', roleId: null }, { roleId: null })).toBe(false);
		expect(
			matches({ kind: 'SURVEY_OPTION', surveyOptionId: 'bus' }, { surveyOptionIds: ['bus'] })
		).toBe(true);
		expect(matches({ kind: 'SURVEY_OPTION', surveyOptionId: 'bus' })).toBe(false);
	});

	test('open paperwork and age', () => {
		expect(matches({ kind: 'PAYMENT_OPEN' }, { paymentOpen: true })).toBe(true);
		expect(matches({ kind: 'PAPERWORK_OPEN' }, { paperworkOpen: true })).toBe(true);
		expect(matches({ kind: 'PAYMENT_OPEN' })).toBe(false);
		expect(matches({ kind: 'MINORS' }, { ofAge: false })).toBe(true);
		expect(matches({ kind: 'ADULTS' }, { ofAge: true })).toBe(true);
		// without a birthday somebody is neither
		expect(matches({ kind: 'MINORS' }, { ofAge: null })).toBe(false);
		expect(matches({ kind: 'ADULTS' }, { ofAge: null })).toBe(false);
	});

	test('the team is only in team blocks, the whole of it or one role', () => {
		const care = { part: 'TEAM', teamRoles: ['PARTICIPANT_CARE'] } as const;
		expect(matches({ kind: 'TEAM' }, care)).toBe(true);
		expect(matches({ kind: 'TEAM', teamRole: 'PARTICIPANT_CARE' }, care)).toBe(true);
		expect(matches({ kind: 'TEAM', teamRole: 'REVIEWER' }, care)).toBe(false);
		expect(matches({ kind: 'TEAM' })).toBe(false);
		expect(matches({ kind: 'ADULTS' }, { ...care, ofAge: true })).toBe(false);
	});
});

describe('inAudience', () => {
	test('one matching block is enough, none matches nobody', () => {
		const audiences: Audience[] = [
			{ kind: 'SUPERVISORS' },
			{ kind: 'COMMITTEE', committeeId: 'ga' }
		];
		expect(inAudience({ subject: subject({ part: 'SUPERVISOR' }), audiences })).toBe(true);
		expect(inAudience({ subject: subject({ committeeId: 'ga' }), audiences })).toBe(true);
		expect(inAudience({ subject: subject({ committeeId: 'sc' }), audiences })).toBe(false);
		expect(inAudience({ subject: subject(), audiences: [] })).toBe(false);
	});
});

describe('normalizeAudiences', () => {
	test('drops doubles and what a kind does not use', () => {
		expect(
			normalizeAudiences([
				{ kind: 'EVERYONE', committeeId: 'ga' },
				{ kind: 'EVERYONE' },
				{ kind: 'COMMITTEE', committeeId: 'ga', roleId: 'fra' },
				{ kind: 'COMMITTEE', committeeId: 'ga' },
				{ kind: 'COMMITTEE', committeeId: 'sc' },
				{ kind: 'TEAM' },
				{ kind: 'TEAM', teamRole: 'REVIEWER' }
			])
		).toEqual([
			{ kind: 'EVERYONE', committeeId: null, roleId: null, surveyOptionId: null, teamRole: null },
			{ kind: 'COMMITTEE', committeeId: 'ga', roleId: null, surveyOptionId: null, teamRole: null },
			{ kind: 'COMMITTEE', committeeId: 'sc', roleId: null, surveyOptionId: null, teamRole: null },
			{ kind: 'TEAM', committeeId: null, roleId: null, surveyOptionId: null, teamRole: null },
			{ kind: 'TEAM', committeeId: null, roleId: null, surveyOptionId: null, teamRole: 'REVIEWER' }
		]);
	});
});

describe('audienceInput', () => {
	test('sends only what a block names, never a null', () => {
		expect(audienceInput({ kind: 'EVERYONE', committeeId: null, roleId: null })).toEqual({
			kind: 'EVERYONE',
			committeeId: undefined,
			roleId: undefined,
			surveyOptionId: undefined,
			teamRole: undefined
		});
		expect(audienceInput({ kind: 'COMMITTEE', committeeId: 'ga' }).committeeId).toBe('ga');
		expect(audienceInput({ kind: 'ROLE', roleId: 'fra' }).roleId).toBe('fra');
		expect(audienceInput({ kind: 'SURVEY_OPTION', surveyOptionId: 'bus' }).surveyOptionId).toBe(
			'bus'
		);
		expect(audienceInput({ kind: 'TEAM', teamRole: 'REVIEWER' }).teamRole).toBe('REVIEWER');
	});
});

describe('audienceSchema', () => {
	test('a block naming something has to say what', () => {
		expect(audienceSchema.safeParse({ kind: 'SUPERVISORS' }).success).toBe(true);
		expect(audienceSchema.safeParse({ kind: 'COMMITTEE' }).success).toBe(false);
		expect(audienceSchema.safeParse({ kind: 'COMMITTEE', committeeId: 'ga' }).success).toBe(true);
		expect(audienceSchema.safeParse({ kind: 'ROLE' }).success).toBe(false);
		expect(audienceSchema.safeParse({ kind: 'SURVEY_OPTION' }).success).toBe(false);
		expect(audienceSchema.safeParse({ kind: 'NOBODY' }).success).toBe(false);
	});
});

const now = new Date('2027-03-01T12:00:00Z');
const hours = (count: number) => new Date(now.getTime() + count * 60 * 60 * 1000);

describe('announcementState', () => {
	const state = (announcement: Parameters<typeof announcementState>[0]['announcement']) =>
		announcementState({ announcement, now });

	test('a draft and an archived one stay what they are', () => {
		expect(state({ status: 'DRAFT', publishAt: null, visibleUntil: null })).toBe('DRAFT');
		expect(state({ status: 'ARCHIVED', publishAt: hours(-1), visibleUntil: null })).toBe(
			'ARCHIVED'
		);
	});

	test('a published one is scheduled, out or expired by the clock', () => {
		expect(state({ status: 'PUBLISHED', publishAt: hours(2), visibleUntil: null })).toBe(
			'SCHEDULED'
		);
		expect(state({ status: 'PUBLISHED', publishAt: hours(-2), visibleUntil: null })).toBe(
			'PUBLISHED'
		);
		expect(state({ status: 'PUBLISHED', publishAt: now, visibleUntil: hours(1) })).toBe(
			'PUBLISHED'
		);
		expect(state({ status: 'PUBLISHED', publishAt: hours(-2), visibleUntil: hours(-1) })).toBe(
			'EXPIRED'
		);
	});
});

describe('owesMail', () => {
	type Mailed = Parameters<typeof owesMail>[0]['announcement'];
	const published: Mailed = {
		status: 'PUBLISHED',
		publishAt: hours(-1),
		visibleUntil: null,
		notifyByMail: true,
		mailSince: hours(-1)
	};
	const owes = (overrides: Partial<Mailed>) =>
		owesMail({ announcement: { ...published, ...overrides }, now });

	test('while it is out and fresh', () => {
		expect(owes({})).toBe(true);
		expect(owes({ notifyByMail: false })).toBe(false);
		expect(owes({ status: 'DRAFT' })).toBe(false);
	});

	test('not before its time and not after a day', () => {
		expect(owes({ publishAt: hours(1), mailSince: hours(1) })).toBe(false);
		expect(owes({ publishAt: hours(-30), mailSince: hours(-30) })).toBe(false);
		// "notify again" starts the day anew
		expect(owes({ publishAt: hours(-30), mailSince: hours(-2) })).toBe(true);
	});

	test('not once it has expired', () => {
		expect(owes({ visibleUntil: hours(-0.5) })).toBe(false);
	});
});

describe('the feed', () => {
	const item = (id: string, overrides: Partial<Parameters<typeof compareFeed>[0]> = {}) => ({
		id,
		pinned: false,
		importance: 'NORMAL' as const,
		publishAt: now,
		read: true,
		...overrides
	});

	test('pinned first, then urgent, then the newest', () => {
		const feed = [
			item('old', { publishAt: hours(-5) }),
			item('new', { publishAt: hours(-1) }),
			item('urgent', { importance: 'URGENT', publishAt: hours(-9) }),
			item('pinned', { pinned: true, publishAt: hours(-20) })
		];
		expect(feed.toSorted(compareFeed).map((entry) => entry.id)).toEqual([
			'pinned',
			'urgent',
			'new',
			'old'
		]);
	});

	test('the dashboard shows the pinned and unread, filled up to the limit', () => {
		const feed = [
			{ id: 'pinned', pinned: true, read: true },
			{ id: 'a', pinned: false, read: true },
			{ id: 'unread', pinned: false, read: false },
			{ id: 'b', pinned: false, read: true },
			{ id: 'unread2', pinned: false, read: false }
		];
		expect(dashboardFeed({ feed, limit: 3 }).map((entry) => entry.id)).toEqual([
			'pinned',
			'unread',
			'unread2'
		]);
		expect(dashboardFeed({ feed: feed.slice(0, 2), limit: 3 }).map((entry) => entry.id)).toEqual([
			'pinned',
			'a'
		]);
		expect(dashboardFeed({ feed: [feed[1], feed[3]], limit: 1 }).map((entry) => entry.id)).toEqual([
			'a'
		]);
	});

	test('the bar shows the newest unread urgent one', () => {
		const feed = [
			{ ...item('read', { importance: 'URGENT' }), read: true },
			{ ...item('older', { importance: 'URGENT', publishAt: hours(-3) }), read: false },
			{ ...item('newer', { importance: 'URGENT', publishAt: hours(-1) }), read: false },
			{ ...item('important', { importance: 'IMPORTANT' }), read: false }
		];
		expect(urgentUnread(feed)?.id).toBe('newer');
		expect(urgentUnread(feed.slice(0, 1))).toBeUndefined();
	});
});
