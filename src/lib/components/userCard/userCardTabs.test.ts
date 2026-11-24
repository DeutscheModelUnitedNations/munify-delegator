import { describe, expect, it } from 'vitest';
import {
	nextUserCardTabToPrefetch,
	shownUserCardTab,
	visibleUserCardTabs,
	type UserCardTabFlags
} from './userCardTabs';

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
	it('offers only the history and the details to somebody without a part', () => {
		expect(visibleUserCardTabs(none)).toEqual(['history', 'person']);
	});

	it('offers registration and formalities to an applicant before the assignment', () => {
		expect(
			visibleUserCardTabs({ ...none, registered: true, holdsPart: true, participant: true })
		).toEqual(['overview', 'registration', 'formalities', 'history', 'person']);
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
		).toEqual(['overview', 'registration', 'formalities', 'onSite', 'papers', 'history', 'person']);
	});

	it('offers the registration tab to somebody only on the waiting list', () => {
		expect(visibleUserCardTabs({ ...none, waiting: true })).toEqual([
			'overview',
			'registration',
			'history',
			'person'
		]);
	});

	it('offers a team member nothing on site, unless they have a participant row', () => {
		const team = { ...none, holdsPart: true, access: true, team: true };
		expect(visibleUserCardTabs(team)).toEqual(['overview', 'registration', 'history', 'person']);
		expect(visibleUserCardTabs({ ...team, participant: true })).toContain('onSite');
	});
});

describe('shownUserCardTab', () => {
	const visible = visibleUserCardTabs({ ...none, registered: true, holdsPart: true });

	it('opens on the overview', () => {
		expect(shownUserCardTab({ picked: null, visible })).toBe('overview');
	});

	it('keeps the picked tab when the person has it', () => {
		expect(shownUserCardTab({ picked: 'registration', visible })).toBe('registration');
		expect(shownUserCardTab({ picked: 'person', visible })).toBe('person');
	});

	it('falls back to the overview when the picked tab is not offered for this person', () => {
		expect(shownUserCardTab({ picked: 'papers', visible })).toBe('overview');
	});

	it('shows the details of somebody without an overview', () => {
		expect(shownUserCardTab({ picked: null, visible: ['history', 'person'] })).toBe('person');
	});
});

describe('nextUserCardTabToPrefetch', () => {
	const visible = ['overview', 'registration', 'formalities', 'history', 'person'] as const;

	it('loads the tab after the shown one first, then the one before it', () => {
		const loaded = new Set<(typeof visible)[number]>();
		expect(nextUserCardTabToPrefetch({ visible, shown: 'formalities', loaded })).toBe('history');
		loaded.add('history');
		expect(nextUserCardTabToPrefetch({ visible, shown: 'formalities', loaded })).toBe(
			'registration'
		);
		loaded.add('registration');
		expect(nextUserCardTabToPrefetch({ visible, shown: 'formalities', loaded })).toBe('person');
		loaded.add('person');
		expect(nextUserCardTabToPrefetch({ visible, shown: 'formalities', loaded })).toBe('overview');
	});

	it('never picks the shown tab, and stops once every other tab is loaded', () => {
		expect(
			nextUserCardTabToPrefetch({
				visible,
				shown: 'overview',
				loaded: new Set(['registration', 'formalities', 'history', 'person'])
			})
		).toBeUndefined();
	});

	it('only offers tabs this card has', () => {
		expect(
			nextUserCardTabToPrefetch({
				visible: ['history', 'person'],
				shown: 'person',
				loaded: new Set()
			})
		).toBe('history');
	});
});
