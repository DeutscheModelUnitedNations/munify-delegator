import { describe, expect, it } from 'vitest';
import {
	hearsOfReports,
	inboxKey,
	paperTopicsOf,
	topicOfInbox,
	topicsOf,
	wantsNotification,
	wantsPaperNotification,
	type NotifiedInbox,
	type NotifiedMember,
	type StoredPreference
} from './teamNotifications';

const carer: NotifiedMember = { userId: 'u-carer', role: 'PARTICIPANT_CARE', functions: [] };
const lead: NotifiedMember = { userId: 'u-lead', role: 'PROJECT_MANAGEMENT', functions: [] };
const chair: NotifiedMember = {
	userId: 'u-chair',
	role: 'MEMBER',
	functions: [
		{ id: 'f-chair-ga', committeeId: 'ga', kind: 'CHAIR' },
		{ id: 'f-consult-sc', committeeId: 'sc', kind: 'CONSULTANT' }
	]
};
const trusted: NotifiedMember = {
	userId: 'u-trusted',
	role: 'MEMBER',
	functions: [{ id: 'f-trusted', committeeId: null, kind: 'TRUSTED_PERSON' }]
};
const plain: NotifiedMember = { userId: 'u-plain', role: 'MEMBER', functions: [] };

const care: NotifiedInbox = { inbox: 'PARTICIPANT_CARE', committeeId: null, trustedUserId: null };
const chairsOfGa: NotifiedInbox = { inbox: 'CHAIR', committeeId: 'ga', trustedUserId: null };
const sharedTrust: NotifiedInbox = {
	inbox: 'TRUSTED_PERSON',
	committeeId: null,
	trustedUserId: null
};

describe('topicsOf', () => {
	it('gives participant care its inbox and the reports', () => {
		for (const member of [carer, lead]) {
			expect(topicsOf(member)).toEqual([
				{ topic: 'PARTICIPANT_CARE', teamFunctionId: null },
				{ topic: 'CHAT_REPORT', teamFunctionId: null }
			]);
		}
	});

	it('gives one line per committee function', () => {
		expect(topicsOf(chair)).toEqual([
			{ topic: 'COMMITTEE_INBOX', teamFunctionId: 'f-chair-ga' },
			{ topic: 'COMMITTEE_INBOX', teamFunctionId: 'f-consult-sc' }
		]);
	});

	it('gives a trusted person the shared chat and their own, apart', () => {
		expect(topicsOf(trusted)).toEqual([
			{ topic: 'TRUSTED_SHARED', teamFunctionId: null },
			{ topic: 'TRUSTED_PERSONAL', teamFunctionId: null }
		]);
	});

	it('adds the papers of each committee function for the paper team', () => {
		expect(topicsOf({ ...chair, role: 'REVIEWER' })).toEqual([
			{ topic: 'COMMITTEE_INBOX', teamFunctionId: 'f-chair-ga' },
			{ topic: 'COMMITTEE_INBOX', teamFunctionId: 'f-consult-sc' },
			{ topic: 'COMMITTEE_PAPERS', teamFunctionId: 'f-chair-ga' },
			{ topic: 'COMMITTEE_PAPERS', teamFunctionId: 'f-consult-sc' }
		]);
	});

	it('gives nothing to a member who answers no inbox', () => {
		expect(topicsOf(plain)).toEqual([]);
	});

	it('lists every topic of somebody with a role and functions', () => {
		const both = { ...carer, functions: [...chair.functions, ...trusted.functions] };
		expect(topicsOf(both).map((key) => key.topic)).toEqual([
			'PARTICIPANT_CARE',
			'COMMITTEE_INBOX',
			'COMMITTEE_INBOX',
			'COMMITTEE_PAPERS',
			'COMMITTEE_PAPERS',
			'TRUSTED_SHARED',
			'TRUSTED_PERSONAL',
			'CHAT_REPORT'
		]);
	});
});

describe('topicOfInbox', () => {
	it('is the participant care topic for the care roles only', () => {
		expect(topicOfInbox({ member: carer, inbox: care })?.topic).toBe('PARTICIPANT_CARE');
		expect(topicOfInbox({ member: chair, inbox: care })).toBeNull();
	});

	it('names the function a committee inbox is answered by', () => {
		expect(topicOfInbox({ member: chair, inbox: chairsOfGa })).toEqual({
			topic: 'COMMITTEE_INBOX',
			teamFunctionId: 'f-chair-ga'
		});
		// a consultant of another committee, a chair of none
		expect(topicOfInbox({ member: chair, inbox: { ...chairsOfGa, committeeId: 'sc' } })).toBeNull();
		expect(topicOfInbox({ member: carer, inbox: chairsOfGa })).toBeNull();
	});

	it('tells the shared trusted chat from the one written to a person alone', () => {
		expect(topicOfInbox({ member: trusted, inbox: sharedTrust })?.topic).toBe('TRUSTED_SHARED');
		expect(
			topicOfInbox({ member: trusted, inbox: { ...sharedTrust, trustedUserId: 'u-trusted' } })
				?.topic
		).toBe('TRUSTED_PERSONAL');
	});

	it('keeps a chat with one trusted person from the others, and from participant care', () => {
		const toOther = { ...sharedTrust, trustedUserId: 'u-other' };
		expect(topicOfInbox({ member: trusted, inbox: toOther })).toBeNull();
		expect(topicOfInbox({ member: carer, inbox: toOther })).toBeNull();
		expect(topicOfInbox({ member: carer, inbox: sharedTrust })).toBeNull();
	});

	it('only offers what topicsOf lists', () => {
		const inboxes = [care, chairsOfGa, sharedTrust, { ...sharedTrust, trustedUserId: 'u-trusted' }];
		for (const member of [carer, chair, trusted, plain]) {
			const listed = topicsOf(member);
			for (const inbox of inboxes) {
				const key = topicOfInbox({ member, inbox });
				if (key) expect(listed).toContainEqual(key);
			}
		}
	});
});

describe('hearsOfReports', () => {
	it('is participant care', () => {
		expect(hearsOfReports(carer)).toBe(true);
		expect(hearsOfReports(lead)).toBe(true);
		expect(hearsOfReports(chair)).toBe(false);
	});
});

describe('wantsNotification', () => {
	const key = { topic: 'PARTICIPANT_CARE' as const, teamFunctionId: null };
	const wants = (
		preferences: StoredPreference[],
		channel: 'EMAIL' | 'SLACK',
		mailByDefault = true
	) => wantsNotification({ preferences, key, channel, mailByDefault });

	it('is on by default on both channels', () => {
		expect(wants([], 'EMAIL')).toBe(true);
		expect(wants([], 'SLACK')).toBe(true);
	});

	it('starts with mail off for whoever switched the unread mails off before, Slack stays on', () => {
		expect(wants([], 'EMAIL', false)).toBe(false);
		expect(wants([], 'SLACK', false)).toBe(true);
	});

	it('follows the stored choice of that topic and channel only', () => {
		const off: StoredPreference = { ...key, channel: 'SLACK', enabled: false };
		expect(wants([off], 'SLACK')).toBe(false);
		expect(wants([off], 'EMAIL')).toBe(true);
		expect(
			wantsNotification({
				preferences: [off],
				key: { topic: 'CHAT_REPORT', teamFunctionId: null },
				channel: 'SLACK',
				mailByDefault: true
			})
		).toBe(true);
	});

	it('lets a stored choice win over the default', () => {
		expect(wants([{ ...key, channel: 'EMAIL', enabled: true }], 'EMAIL', false)).toBe(true);
	});

	it('tells the functions of two committees apart', () => {
		const offForGa: StoredPreference = {
			topic: 'COMMITTEE_INBOX',
			teamFunctionId: 'f-chair-ga',
			channel: 'EMAIL',
			enabled: false
		};
		const ask = (teamFunctionId: string) =>
			wantsNotification({
				preferences: [offForGa],
				key: { topic: 'COMMITTEE_INBOX', teamFunctionId },
				channel: 'EMAIL',
				mailByDefault: true
			});
		expect(ask('f-chair-ga')).toBe(false);
		expect(ask('f-consult-sc')).toBe(true);
	});
});

describe('inboxKey', () => {
	it('is one string per inbox', () => {
		const keys = [
			care,
			chairsOfGa,
			{ ...chairsOfGa, inbox: 'CONSULTANT' as const },
			{ ...chairsOfGa, committeeId: 'sc' },
			sharedTrust,
			{ ...sharedTrust, trustedUserId: 'u-trusted' }
		].map(inboxKey);
		expect(new Set(keys).size).toBe(keys.length);
	});
});

describe('paperTopicsOf', () => {
	const reviewingChair: NotifiedMember = { ...chair, role: 'REVIEWER' };

	it('tells a chair or consultant on the paper team of their own committee', () => {
		expect(paperTopicsOf({ member: reviewingChair, committeeId: 'ga' })).toEqual([
			{ topic: 'COMMITTEE_PAPERS', teamFunctionId: 'f-chair-ga' }
		]);
		expect(paperTopicsOf({ member: reviewingChair, committeeId: 'sc' })).toEqual([
			{ topic: 'COMMITTEE_PAPERS', teamFunctionId: 'f-consult-sc' }
		]);
	});

	it('tells every role that may read papers', () => {
		for (const role of [
			'REVIEWER',
			'PROJECT_MANAGEMENT',
			'PARTICIPANT_CARE',
			'TEAM_COORDINATOR',
			'CONTENT_LEAD'
		]) {
			expect(paperTopicsOf({ member: { ...chair, role }, committeeId: 'ga' })).toHaveLength(1);
		}
	});

	it('tells nobody whose role may not read papers', () => {
		expect(paperTopicsOf({ member: chair, committeeId: 'ga' })).toEqual([]);
	});

	it('tells nobody of another committee, and no trusted person', () => {
		expect(paperTopicsOf({ member: reviewingChair, committeeId: 'hrc' })).toEqual([]);
		expect(paperTopicsOf({ member: { ...trusted, role: 'REVIEWER' }, committeeId: 'ga' })).toEqual(
			[]
		);
		expect(paperTopicsOf({ member: { ...lead, functions: [] }, committeeId: 'ga' })).toEqual([]);
	});

	it('gives both functions of somebody chairing and consulting one committee', () => {
		const twice: NotifiedMember = {
			...reviewingChair,
			functions: [
				{ id: 'f-chair-ga', committeeId: 'ga', kind: 'CHAIR' },
				{ id: 'f-consult-ga', committeeId: 'ga', kind: 'CONSULTANT' }
			]
		};
		expect(paperTopicsOf({ member: twice, committeeId: 'ga' })).toHaveLength(2);
	});
});

describe('wantsPaperNotification', () => {
	const twice: NotifiedMember = {
		userId: 'u-twice',
		role: 'REVIEWER',
		functions: [
			{ id: 'f-chair-ga', committeeId: 'ga', kind: 'CHAIR' },
			{ id: 'f-consult-ga', committeeId: 'ga', kind: 'CONSULTANT' }
		]
	};
	const off = (teamFunctionId: string, channel: 'EMAIL' | 'SLACK'): StoredPreference => ({
		topic: 'COMMITTEE_PAPERS',
		teamFunctionId,
		channel,
		enabled: false
	});

	it('is on by default on both channels', () => {
		for (const channel of ['EMAIL', 'SLACK'] as const) {
			expect(
				wantsPaperNotification({
					member: twice,
					committeeId: 'ga',
					preferences: [],
					channel,
					mailByDefault: true
				})
			).toBe(true);
		}
	});

	it('starts mail off for somebody who switched the message mails off', () => {
		expect(
			wantsPaperNotification({
				member: twice,
				committeeId: 'ga',
				preferences: [],
				channel: 'EMAIL',
				mailByDefault: false
			})
		).toBe(false);
	});

	it('follows the stored choice per channel', () => {
		const preferences = [off('f-chair-ga', 'SLACK'), off('f-consult-ga', 'SLACK')];
		const wants = (channel: 'EMAIL' | 'SLACK') =>
			wantsPaperNotification({
				member: twice,
				committeeId: 'ga',
				preferences,
				channel,
				mailByDefault: true
			});
		expect(wants('SLACK')).toBe(false);
		expect(wants('EMAIL')).toBe(true);
	});

	it('tells somebody with two functions there when either wants it', () => {
		expect(
			wantsPaperNotification({
				member: twice,
				committeeId: 'ga',
				preferences: [off('f-chair-ga', 'EMAIL')],
				channel: 'EMAIL',
				mailByDefault: true
			})
		).toBe(true);
	});

	it('is false for a member the committee does not concern', () => {
		expect(
			wantsPaperNotification({
				member: { ...twice, role: 'MEMBER' },
				committeeId: 'ga',
				preferences: [],
				channel: 'SLACK',
				mailByDefault: true
			})
		).toBe(false);
	});
});
