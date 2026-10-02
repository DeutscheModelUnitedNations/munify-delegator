import { describe, expect, test } from 'vitest';
import {
	buildChaseImport,
	composeUserName,
	transformRegionalGroup,
	type ChaseConferenceData
} from './chaseExport';

const person = (givenName: string | null, familyName: string | null, email = 'x@example.org') => ({
	givenName,
	familyName,
	email
});

describe('composeUserName', () => {
	test('joins the names and is undefined without any', () => {
		expect(composeUserName(person('Ada', 'Lovelace'))).toBe('Ada Lovelace');
		expect(composeUserName(person(null, 'Lovelace'))).toBe('Lovelace');
		expect(composeUserName(person('Ada', null))).toBe('Ada');
		expect(composeUserName(person(null, null))).toBeUndefined();
	});
});

describe('transformRegionalGroup', () => {
	test('maps every UN regional group to its chase value', () => {
		expect(transformRegionalGroup('African Group')).toBe('AFRICA');
		expect(transformRegionalGroup('Asia and the Pacific Group')).toBe('ASIA_PACIFIC');
		expect(transformRegionalGroup('Eastern European Group')).toBe('EASTERN_EUROPE');
		expect(transformRegionalGroup('Latin American and Caribbean Group')).toBe(
			'LATIN_AMERICA_CARIBBEAN'
		);
		expect(transformRegionalGroup('Western European and Others Group')).toBe(
			'WESTERN_EUROPE_OTHERS'
		);
	});

	test('is undefined for anything else', () => {
		expect(transformRegionalGroup(undefined)).toBeUndefined();
		expect(transformRegionalGroup('Unknown')).toBeUndefined();
		expect(transformRegionalGroup('toString')).toBeUndefined();
	});
});

describe('buildChaseImport', () => {
	const data: ChaseConferenceData = {
		id: 'conf',
		title: 'MUN-SH',
		committees: [
			{
				id: 'ga',
				name: 'General Assembly',
				abbreviation: 'GA',
				agendaItems: [{ id: 'a1', title: 'Climate' }]
			},
			{ id: 'sc', name: 'Security Council', abbreviation: 'SC', agendaItems: [] }
		],
		singleParticipants: [
			{ id: 'sp1', user: person('Press', 'Person'), assignedRole: { id: 'r' } },
			{ id: 'sp2', user: person('No', 'Role'), assignedRole: null }
		],
		conferenceSupervisors: [{ id: 'sup', user: person('Super', 'Visor') }],
		nonStateActors: [{ id: 'nsa1', name: 'Greenpeace', fontAwesomeIcon: 'leaf' }],
		delegationMembers: [
			{
				id: 'dm1',
				assignedCommittee: { id: 'ga' },
				user: person('A', 'One'),
				delegation: { assignedNation: { alpha3Code: 'DEU' }, assignedNonStateActor: null }
			},
			{
				id: 'dm2',
				assignedCommittee: { id: 'ga' },
				user: person('B', 'Two'),
				delegation: { assignedNation: { alpha3Code: 'DEU' }, assignedNonStateActor: null }
			},
			{
				id: 'dm3',
				assignedCommittee: null,
				user: person('C', 'Three'),
				delegation: { assignedNation: { alpha3Code: 'DEU' }, assignedNonStateActor: null }
			},
			{
				id: 'dm4',
				user: person('D', 'Four'),
				delegation: { assignedNation: null, assignedNonStateActor: { id: 'nsa1' } }
			},
			{ id: 'dm5', user: person('E', 'Five'), delegation: null }
		],
		teamMembers: [
			{ id: 'tm1', role: 'PROJECT_MANAGEMENT', user: person('Head', 'Lead') },
			{ id: 'tm2', role: 'PARTICIPANT_CARE', user: person(null, null) }
		]
	};

	const nations = [
		{ alpha2Code: 'de', alpha3Code: 'DEU' },
		{ alpha2Code: 'fr', alpha3Code: 'FRA' }
	];

	const build = () => {
		let counter = 0;
		return buildChaseImport(data, nations, () => `id${++counter}`);
	};

	test('creates a representation per nation and per non-state actor', () => {
		expect(build().representations).toEqual([
			{
				id: 'id1',
				representationType: 'DELEGATION',
				alpha3Code: 'DEU',
				alpha2Code: 'de',
				regionalGroup: 'WESTERN_EUROPE_OTHERS'
			},
			{
				id: 'id2',
				representationType: 'DELEGATION',
				alpha3Code: 'FRA',
				alpha2Code: 'fr',
				regionalGroup: 'WESTERN_EUROPE_OTHERS'
			},
			{ id: 'nsa1', representationType: 'NSA', name: 'Greenpeace', faIcon: 'leaf' }
		]);
	});

	test('shares one committee member between delegates of a nation in a committee', () => {
		const result = build();
		expect(result.committeeMembers).toEqual([
			{ id: 'id3', representationId: 'id1', committeeId: 'ga' }
		]);
		const delegates = result.conferenceUsers.filter((u) => u.conferenceUserType === 'DELEGATE');
		expect(delegates).toEqual([
			{
				id: 'dm1_user',
				conferenceUserType: 'DELEGATE',
				userEmail: 'x@example.org',
				name: 'A One',
				committeeMemberId: 'id3'
			},
			{
				id: 'dm2_user',
				conferenceUserType: 'DELEGATE',
				userEmail: 'x@example.org',
				name: 'B Two',
				committeeMemberId: 'id3'
			}
		]);
	});

	test('turns NSA delegation members into conference members with a user each', () => {
		const result = build();
		expect(result.conferenceMembers).toEqual([{ id: 'dm4', representationId: 'nsa1' }]);
		expect(
			result.conferenceUsers.filter((u) => u.conferenceUserType === 'NON_STATE_ACTOR')
		).toEqual([
			{
				id: 'dm4_user',
				conferenceUserType: 'NON_STATE_ACTOR',
				userEmail: 'x@example.org',
				name: 'D Four',
				conferenceMemberId: 'dm4'
			}
		]);
	});

	test('maps team, supervisors and assigned single participants to users', () => {
		const users = build().conferenceUsers;
		expect(users.slice(0, 3)).toEqual([
			{ id: 'tm1', conferenceUserType: 'ADMIN', userEmail: 'x@example.org', name: 'Head Lead' },
			{ id: 'tm2', conferenceUserType: 'TEAM', userEmail: 'x@example.org', name: undefined },
			{
				id: 'sup',
				conferenceUserType: 'SPECTATOR',
				userEmail: 'x@example.org',
				name: 'Super Visor'
			}
		]);
		expect(users.at(-1)).toEqual({
			id: 'sp1',
			conferenceUserType: 'SPECTATOR',
			userEmail: 'x@example.org',
			name: 'Press Person'
		});
		expect(users.map((u) => u.id)).not.toContain('sp2');
	});

	test('copies the conference, committees and agenda items', () => {
		const result = build();
		expect(result.$schema).toBe('https://chase.munify.cloud/api/schema/import');
		expect(result.id).toBe('conf');
		expect(result.title).toBe('MUN-SH');
		expect(result.committees).toEqual([
			{ id: 'ga', name: 'General Assembly', abbreviation: 'GA' },
			{ id: 'sc', name: 'Security Council', abbreviation: 'SC' }
		]);
		expect(result.agendaItems).toEqual([{ id: 'a1', committeeId: 'ga', title: 'Climate' }]);
	});
});
