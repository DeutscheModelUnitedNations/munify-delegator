import { describe, expect, test } from 'vitest';
import {
	availablePaperHubViews,
	effectivePaperHubView,
	isPaperHubView,
	paperHubAccess,
	showPaperHubViewToggle,
	type PaperHubAccess
} from './paperHubViews';

const none: PaperHubAccess = {
	isTeamMember: false,
	isSupervisor: false,
	isPaperAuthor: false,
	isSingleParticipant: false,
	isParticipant: false
};
const author: PaperHubAccess = { ...none, isPaperAuthor: true, isParticipant: true };
const single: PaperHubAccess = { ...none, isSingleParticipant: true, isParticipant: true };
const supervisor: PaperHubAccess = { ...none, isSupervisor: true, isParticipant: true };
const team: PaperHubAccess = { ...none, isTeamMember: true };

const noRoles = { isReviewer: false, supervisor: null, supervisedDelegationIds: [] };
const noParticipation = { delegationMember: null, singleParticipant: null, supervisor: null };

describe('isPaperHubView', () => {
	test('accepts the known views only', () => {
		expect(isPaperHubView('team')).toBe(true);
		expect(isPaperHubView('global')).toBe(true);
		expect(isPaperHubView('admin')).toBe(false);
		expect(isPaperHubView(null)).toBe(false);
	});
});

describe('paperHubAccess', () => {
	test('nobody without a participation or roles', () => {
		expect(paperHubAccess(undefined, noRoles)).toEqual(none);
	});

	test('a delegation member is a paper author', () => {
		expect(paperHubAccess({ ...noParticipation, delegationMember: {} }, noRoles)).toEqual(author);
	});

	test('a single participant is not one when also a delegation member', () => {
		expect(paperHubAccess({ ...noParticipation, singleParticipant: {} }, noRoles)).toEqual(single);
		expect(
			paperHubAccess({ ...noParticipation, singleParticipant: {}, delegationMember: {} }, noRoles)
				.isSingleParticipant
		).toBe(false);
	});

	test('a supervisor needs supervised delegations to get the supervisor view', () => {
		const access = paperHubAccess(
			{ ...noParticipation, supervisor: {} },
			{ ...noRoles, supervisor: {} }
		);
		expect(access).toEqual({ ...none, isParticipant: true });
		expect(
			paperHubAccess(
				{ ...noParticipation, supervisor: {} },
				{ ...noRoles, supervisor: {}, supervisedDelegationIds: ['d'] }
			)
		).toEqual(supervisor);
	});

	test('a reviewer is a team member', () => {
		expect(paperHubAccess(noParticipation, { ...noRoles, isReviewer: true })).toEqual(team);
	});
});

describe('availablePaperHubViews', () => {
	test('maps each role to its view', () => {
		expect(availablePaperHubViews({ ...author, isTeamMember: true })).toEqual({
			participant: true,
			supervisor: false,
			team: true,
			global: true
		});
	});
});

describe('effectivePaperHubView', () => {
	test('single participants only see the global view', () => {
		expect(effectivePaperHubView(single, 'participant')).toBe('global');
		expect(effectivePaperHubView(single, 'team')).toBe('global');
	});

	test('a single participant who also reviews may switch', () => {
		expect(effectivePaperHubView({ ...single, isTeamMember: true }, 'team')).toBe('team');
	});

	test('the requested view is kept when available', () => {
		expect(effectivePaperHubView({ ...author, isTeamMember: true }, 'team')).toBe('team');
		expect(effectivePaperHubView(author, 'global')).toBe('global');
		expect(effectivePaperHubView(supervisor, 'supervisor')).toBe('supervisor');
		expect(effectivePaperHubView(author, 'participant')).toBe('participant');
	});

	test('falls back to the most specific available view', () => {
		expect(effectivePaperHubView(author, 'team')).toBe('participant');
		expect(effectivePaperHubView(supervisor, 'participant')).toBe('supervisor');
		expect(effectivePaperHubView(team, 'participant')).toBe('team');
		expect(effectivePaperHubView(none, 'team')).toBe('global');
	});
});

describe('showPaperHubViewToggle', () => {
	test('is shown to anyone with more than one view', () => {
		expect(showPaperHubViewToggle(author)).toBe(true);
		expect(showPaperHubViewToggle(supervisor)).toBe(true);
		expect(showPaperHubViewToggle({ ...team, isParticipant: true })).toBe(true);
	});

	test('is hidden from single participants and from team members alone', () => {
		expect(showPaperHubViewToggle(single)).toBe(false);
		expect(showPaperHubViewToggle({ ...single, isTeamMember: true })).toBe(false);
		expect(showPaperHubViewToggle(team)).toBe(false);
		expect(showPaperHubViewToggle(none)).toBe(false);
	});
});
