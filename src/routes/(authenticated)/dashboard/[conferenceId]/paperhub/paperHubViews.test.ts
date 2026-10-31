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
		expect(paperHubAccess({ participation: undefined, roles: noRoles })).toEqual(none);
	});

	test('a delegation member is a paper author', () => {
		expect(
			paperHubAccess({
				participation: { ...noParticipation, delegationMember: {} },
				roles: noRoles
			})
		).toEqual(author);
	});

	test('a single participant is not one when also a delegation member', () => {
		expect(
			paperHubAccess({
				participation: { ...noParticipation, singleParticipant: {} },
				roles: noRoles
			})
		).toEqual(single);
		expect(
			paperHubAccess({
				participation: { ...noParticipation, singleParticipant: {}, delegationMember: {} },
				roles: noRoles
			}).isSingleParticipant
		).toBe(false);
	});

	test('a supervisor needs supervised delegations to get the supervisor view', () => {
		const access = paperHubAccess({
			participation: { ...noParticipation, supervisor: {} },
			roles: { ...noRoles, supervisor: {} }
		});
		expect(access).toEqual({ ...none, isParticipant: true });
		expect(
			paperHubAccess({
				participation: { ...noParticipation, supervisor: {} },
				roles: { ...noRoles, supervisor: {}, supervisedDelegationIds: ['d'] }
			})
		).toEqual(supervisor);
	});

	test('a reviewer is a team member', () => {
		expect(
			paperHubAccess({ participation: noParticipation, roles: { ...noRoles, isReviewer: true } })
		).toEqual(team);
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
		expect(effectivePaperHubView({ access: single, requested: 'participant' })).toBe('global');
		expect(effectivePaperHubView({ access: single, requested: 'team' })).toBe('global');
	});

	test('a single participant who also reviews may switch', () => {
		expect(
			effectivePaperHubView({ access: { ...single, isTeamMember: true }, requested: 'team' })
		).toBe('team');
	});

	test('the requested view is kept when available', () => {
		expect(
			effectivePaperHubView({ access: { ...author, isTeamMember: true }, requested: 'team' })
		).toBe('team');
		expect(effectivePaperHubView({ access: author, requested: 'global' })).toBe('global');
		expect(effectivePaperHubView({ access: supervisor, requested: 'supervisor' })).toBe(
			'supervisor'
		);
		expect(effectivePaperHubView({ access: author, requested: 'participant' })).toBe('participant');
	});

	test('falls back to the most specific available view', () => {
		expect(effectivePaperHubView({ access: author, requested: 'team' })).toBe('participant');
		expect(effectivePaperHubView({ access: supervisor, requested: 'participant' })).toBe(
			'supervisor'
		);
		expect(effectivePaperHubView({ access: team, requested: 'participant' })).toBe('team');
		expect(effectivePaperHubView({ access: none, requested: 'team' })).toBe('global');
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
