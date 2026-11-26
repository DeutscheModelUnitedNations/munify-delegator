import { describe, expect, it } from 'vitest';
import {
	nextUserCardTabToPrefetch,
	openingUserCardTab,
	shownUserCardTab,
	visibleUserCardTabs,
	type UserCardTabFlags
} from './userCardTabs';

const none: UserCardTabFlags = {
	registered: false,
	waiting: false,
	participant: false,
	access: false,
	team: false,
	papers: false,
	narrow: false
};

describe('visibleUserCardTabs', () => {
	it('offers only the history to somebody without a part', () => {
		expect(visibleUserCardTabs(none)).toEqual(['history']);
	});

	it('offers registration and formalities to an applicant before the assignment', () => {
		expect(visibleUserCardTabs({ ...none, registered: true, participant: true })).toEqual([
			'registration',
			'formalities',
			'history'
		]);
	});

	it('offers everything to a seated delegate', () => {
		expect(
			visibleUserCardTabs({
				...none,
				registered: true,
				participant: true,
				access: true
			})
		).toEqual(['registration', 'formalities', 'program', 'history']);
	});

	it('offers the registration tab to somebody only on the waiting list', () => {
		expect(visibleUserCardTabs({ ...none, waiting: true })).toEqual(['registration', 'history']);
	});

	it('offers a team member the history, with a participant row their formalities', () => {
		const team = { ...none, access: true, team: true };
		expect(visibleUserCardTabs(team)).toEqual(['history']);
		expect(visibleUserCardTabs({ ...team, participant: true })).toEqual(['formalities', 'history']);
	});
});

describe('somebody with a paper', () => {
	it('keeps it within reach without a seat', () => {
		expect(visibleUserCardTabs({ ...none, registered: true, papers: true })).toEqual([
			'registration',
			'program',
			'history'
		]);
	});
});

describe('a narrow card', () => {
	it('has the details as a tab, which somebody without a part opens on', () => {
		const visible = visibleUserCardTabs({ ...none, narrow: true });
		expect(visible).toEqual(['person', 'history']);
		expect(shownUserCardTab({ picked: null, opening: 'registration', visible })).toBe('person');
	});

	it('opens on the same tab as a wide one for everybody else', () => {
		const visible = visibleUserCardTabs({
			...none,
			registered: true,
			narrow: true
		});
		expect(visible).toEqual(['person', 'registration', 'history']);
		expect(shownUserCardTab({ picked: null, opening: 'registration', visible })).toBe(
			'registration'
		);
	});

	it('leaves the details once there is room for them again', () => {
		expect(
			shownUserCardTab({
				picked: 'person',
				opening: 'formalities',
				visible: ['registration', 'formalities', 'history']
			})
		).toBe('formalities');
	});
});

describe('openingUserCardTab', () => {
	it('opens on the formalities of somebody with a place', () => {
		expect(openingUserCardTab({ access: true, participant: true })).toBe('formalities');
	});

	it('opens on the application until there is a place', () => {
		expect(openingUserCardTab({ access: false, participant: true })).toBe('registration');
		expect(openingUserCardTab({ access: false, participant: false })).toBe('registration');
	});
});

describe('shownUserCardTab', () => {
	const visible = visibleUserCardTabs({
		...none,
		registered: true,
		participant: true
	});

	it('opens on the tab for the person', () => {
		expect(shownUserCardTab({ picked: null, opening: 'formalities', visible })).toBe('formalities');
	});

	it('keeps the picked tab when the person has it', () => {
		expect(shownUserCardTab({ picked: 'registration', opening: 'formalities', visible })).toBe(
			'registration'
		);
	});

	it('falls back when the picked tab is not offered for this person', () => {
		expect(shownUserCardTab({ picked: 'program', opening: 'formalities', visible })).toBe(
			'formalities'
		);
	});

	it('shows the history of somebody with nothing else', () => {
		expect(shownUserCardTab({ picked: null, opening: 'registration', visible: ['history'] })).toBe(
			'history'
		);
	});
});

describe('nextUserCardTabToPrefetch', () => {
	const visible = ['person', 'registration', 'formalities', 'history'] as const;

	it('loads the tab after the shown one first, then the one before it', () => {
		const loaded = new Set<(typeof visible)[number]>();
		expect(nextUserCardTabToPrefetch({ visible, shown: 'formalities', loaded })).toBe('history');
		loaded.add('history');
		expect(nextUserCardTabToPrefetch({ visible, shown: 'formalities', loaded })).toBe(
			'registration'
		);
		loaded.add('registration');
		expect(nextUserCardTabToPrefetch({ visible, shown: 'formalities', loaded })).toBe('person');
	});

	it('never picks the shown tab, and stops once every other tab is loaded', () => {
		expect(
			nextUserCardTabToPrefetch({
				visible,
				shown: 'person',
				loaded: new Set(['registration', 'formalities', 'history'])
			})
		).toBeUndefined();
	});

	it('only offers tabs this card has', () => {
		expect(
			nextUserCardTabToPrefetch({
				visible: ['person', 'history'],
				shown: 'person',
				loaded: new Set()
			})
		).toBe('history');
	});
});
