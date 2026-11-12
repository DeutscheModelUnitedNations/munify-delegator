import { describe, expect, test } from 'vitest';
import {
	chatAvatar,
	chatSubtitle,
	chatTitle,
	contactDetail,
	contactLabel,
	contactSearchText,
	inboxName,
	matchesSearch,
	listBadge,
	sideOf
} from './chatLabels';
import { groupContacts, OTHER_GROUP } from './contactGroups';

const germany = {
	participantId: 'p-deu',
	roleKind: 'NATION',
	nationAlpha3Code: 'deu',
	nationAlpha2Code: 'DE',
	committeeId: 'ga',
	committeeAbbreviation: 'GV',
	committeeName: 'Generalversammlung',
	ordinal: null
};
const press = { participantId: 'p-press', roleKind: 'CUSTOM', roleName: 'Presse', ordinal: 2 };
const nsa = {
	participantId: 'p-nsa',
	roleKind: 'NON_STATE_ACTOR',
	roleName: 'Amnesty International',
	roleAbbreviation: 'AI',
	roleIcon: 'candle'
};

describe('contact labels', () => {
	test('a delegate is their nation and committee', () => {
		expect(contactLabel(germany)).toBe('Deutschland · GV');
	});

	test('several people sharing a role are numbered', () => {
		expect(contactDetail(press)).toBe('Nr. 2');
		expect(contactLabel(press)).toBe('Presse · Nr. 2');
	});

	test('a non-state actor is just its name', () => {
		expect(contactLabel(nsa)).toBe('Amnesty International');
		expect(contactDetail(nsa)).toBe('');
	});
});

describe('inboxName', () => {
	test('names the function and its committee', () => {
		expect(inboxName({ inbox: 'PARTICIPANT_CARE' })).toBe('Teilnehmendenbetreuung');
		expect(inboxName({ inbox: 'CHAIR', committeeAbbreviation: 'GV' })).toBe('Vorsitz · GV');
		expect(inboxName({ inbox: 'CONSULTANT', committeeAbbreviation: 'SR' })).toBe(
			'Gremienberatung · SR'
		);
	});
});

describe('chatTitle', () => {
	const base = { contacts: [], people: [] };

	test('a direct chat is called after the other party', () => {
		expect(chatTitle({ ...base, kind: 'DIRECT', side: 'PARTICIPANT', contacts: [germany] })).toBe(
			'Deutschland · GV'
		);
	});

	test('a team chat is the inbox for the participant and the participant for the inbox', () => {
		const chat = {
			...base,
			kind: 'TEAM' as const,
			inbox: 'CONSULTANT' as const,
			committee: { abbreviation: 'GV' },
			contacts: [germany]
		};
		expect(chatTitle({ ...chat, side: 'PARTICIPANT', contacts: [] })).toBe('Gremienberatung · GV');
		expect(chatTitle({ ...chat, side: 'TEAM' })).toBe('Deutschland · GV');
	});

	test('participant care sees the name of somebody without a seat', () => {
		const chat = {
			kind: 'TEAM' as const,
			side: 'TEAM',
			inbox: 'PARTICIPANT_CARE' as const,
			contacts: [],
			people: [{ name: 'Anna Schmidt' }]
		};
		expect(chatTitle(chat)).toBe('Anna Schmidt');
		expect(chatSubtitle(chat)).toBe('Anna Schmidt');
	});

	test('a reviewed direct chat names both parties', () => {
		expect(chatTitle({ ...base, kind: 'DIRECT', side: 'REVIEW', contacts: [germany, press] })).toBe(
			'Deutschland · GV ↔ Presse · Nr. 2'
		);
	});

	test('a participant never gets a subtitle of names', () => {
		expect(
			chatSubtitle({
				kind: 'DIRECT',
				side: 'PARTICIPANT',
				contacts: [germany],
				people: [{ name: 'Anna Schmidt' }]
			})
		).toBeUndefined();
	});

	test('the delegation group is "mine" only for its members', () => {
		expect(chatTitle({ ...base, kind: 'DELEGATION', side: 'PARTICIPANT' })).toBe(
			'Meine Delegation'
		);
		expect(chatTitle({ ...base, kind: 'DELEGATION', side: 'REVIEW' })).toBe('Delegationsgruppe');
	});
});

describe('chatAvatar', () => {
	test('shows the flag of a nation and an icon for everything else', () => {
		expect(chatAvatar({ kind: 'DIRECT', side: 'PARTICIPANT', contacts: [germany] })).toEqual({
			alpha2Code: 'de'
		});
		expect(chatAvatar({ kind: 'DIRECT', side: 'PARTICIPANT', contacts: [nsa] })).toEqual({
			icon: 'candle'
		});
		expect(chatAvatar({ kind: 'DELEGATION', side: 'PARTICIPANT', contacts: [] })).toEqual({
			icon: 'users-three'
		});
		expect(chatAvatar({ kind: 'TEAM', side: 'PARTICIPANT', inbox: 'CHAIR', contacts: [] })).toEqual(
			{ icon: 'gavel' }
		);
	});
});

describe('sideOf', () => {
	test('reads an unknown side as only reviewing', () => {
		expect(sideOf({ side: 'TEAM' })).toBe('TEAM');
		expect(sideOf({ side: 'something else' })).toBe('REVIEW');
	});
});

describe('searching contacts', () => {
	const haystack = contactSearchText(germany);

	test('finds a contact by every word, in any order and without accents', () => {
		expect(matchesSearch({ haystack, search: 'deu gv' })).toBe(true);
		expect(matchesSearch({ haystack, search: 'GENERAL deutsch' })).toBe(true);
		expect(matchesSearch({ haystack, search: 'deutschland sr' })).toBe(false);
		expect(
			matchesSearch({ haystack: contactSearchText({ ...press, roleName: 'Café' }), search: 'cafe' })
		).toBe(true);
	});

	test('an empty search finds everybody', () => {
		expect(matchesSearch({ haystack, search: '  ' })).toBe(true);
	});
});

describe('groupContacts', () => {
	test('groups by committee, the people without one last, each by name', () => {
		const france = { ...germany, participantId: 'p-fra', nationAlpha3Code: 'fra' };
		const council = {
			...germany,
			participantId: 'p-sc',
			committeeId: 'sc',
			committeeAbbreviation: 'SR',
			committeeName: 'Sicherheitsrat'
		};
		const groups = groupContacts([press, council, france, germany, nsa]);
		expect(groups.map((group) => group.key)).toEqual(['ga', 'sc', OTHER_GROUP]);
		expect(groups[0]?.contacts.map((contact) => contact.participantId)).toEqual(['p-deu', 'p-fra']);
		expect(groups[2]?.contacts.map((contact) => contact.participantId)).toEqual([
			'p-nsa',
			'p-press'
		]);
	});
});

describe('listBadge', () => {
	const team = { side: 'TEAM', underReview: false, inbox: 'CHAIR' as const };

	test('marks a chat participant care reads under a report', () => {
		expect(
			listBadge({ chat: { side: 'REVIEW', underReview: true, inbox: null }, showInbox: true })
		).toBe('reported');
	});

	test('does not tell the parties or the inbox about a report', () => {
		expect(listBadge({ chat: { ...team, underReview: true }, showInbox: false })).toBeNull();
		expect(
			listBadge({ chat: { side: 'PARTICIPANT', underReview: true }, showInbox: true })
		).toBeNull();
	});

	test('names the inbox of a team chat only in a list mixing several', () => {
		expect(listBadge({ chat: team, showInbox: true })).toEqual({ inbox: 'CHAIR' });
		expect(listBadge({ chat: team, showInbox: false })).toBeNull();
		expect(
			listBadge({
				chat: { side: 'PARTICIPANT', underReview: false, inbox: 'CHAIR' },
				showInbox: true
			})
		).toBeNull();
	});
});
