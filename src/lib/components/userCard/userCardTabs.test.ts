import { describe, expect, it } from 'vitest';
import { shownUserCardTab, visibleUserCardTabs, type UserCardTabFlags } from './userCardTabs';

const none: UserCardTabFlags = {
	registered: false,
	waiting: false,
	holdsPart: false,
	participant: false,
	access: false,
	team: false,
	delegate: false
};

describe('visibleUserCardTabs', () => {
	it('offers only the person and their history to somebody without a part', () => {
		expect(visibleUserCardTabs(none)).toEqual(['person', 'history']);
	});

	it('offers registration and formalities to an applicant before the assignment', () => {
		expect(
			visibleUserCardTabs({ ...none, registered: true, holdsPart: true, participant: true })
		).toEqual(['person', 'registration', 'seat', 'formalities', 'history']);
	});

	it('offers everything to a seated delegate', () => {
		expect(
			visibleUserCardTabs({
				...none,
				registered: true,
				holdsPart: true,
				participant: true,
				access: true,
				delegate: true
			})
		).toEqual([
			'person',
			'registration',
			'seat',
			'formalities',
			'conference',
			'surveys',
			'papers',
			'history'
		]);
	});

	it('offers the registration tab to somebody only on the waiting list', () => {
		expect(visibleUserCardTabs({ ...none, waiting: true })).toEqual([
			'person',
			'registration',
			'history'
		]);
	});

	it('offers a team member their seat but no surveys', () => {
		expect(visibleUserCardTabs({ ...none, holdsPart: true, access: true, team: true })).toEqual([
			'person',
			'seat',
			'history'
		]);
	});
});

describe('shownUserCardTab', () => {
	const tabs = visibleUserCardTabs({ ...none, registered: true, holdsPart: true });

	it('keeps the picked tab when the person has it', () => {
		expect(shownUserCardTab({ picked: 'seat', visible: tabs, state: 'ACTIVE' })).toBe('seat');
	});

	it('falls back when the picked tab is not offered for this person', () => {
		expect(
			shownUserCardTab({ picked: 'papers', visible: tabs, state: 'PARTICIPANT_REGISTRATION' })
		).toBe('registration');
	});

	it('suggests the tab of the conference state when nothing was picked', () => {
		const all = visibleUserCardTabs({
			...none,
			registered: true,
			holdsPart: true,
			participant: true,
			access: true
		});
		expect(shownUserCardTab({ picked: null, visible: all, state: 'PREPARATION' })).toBe(
			'formalities'
		);
		expect(shownUserCardTab({ picked: null, visible: all, state: 'ACTIVE' })).toBe('conference');
	});

	it('takes the first tab when the suggested one is not offered', () => {
		expect(
			shownUserCardTab({ picked: null, visible: ['person', 'history'], state: 'ACTIVE' })
		).toBe('person');
	});
});
