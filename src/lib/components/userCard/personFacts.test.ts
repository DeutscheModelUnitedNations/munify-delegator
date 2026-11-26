import { describe, expect, it } from 'vitest';
import { addressFacts, ageAtStart, readsWholePerson } from './personFacts';

describe('readsWholePerson', () => {
	const stranger = { self: false, onTeam: false, inConference: true };
	const as = (...roles: ('PARTICIPANT_CARE' | 'TEAM_COORDINATOR' | 'REVIEWER' | 'MEMBER')[]) => ({
		isAdmin: false,
		roles
	});

	it('is true for system admins and for oneself', () => {
		expect(readsWholePerson({ access: { isAdmin: true, roles: [] }, ...stranger })).toBe(true);
		expect(readsWholePerson({ access: as('MEMBER'), ...stranger, self: true })).toBe(true);
	});

	it('is true for participant care reading a participant of the conference', () => {
		expect(readsWholePerson({ access: as('PARTICIPANT_CARE'), ...stranger })).toBe(true);
		expect(
			readsWholePerson({ access: as('PARTICIPANT_CARE'), ...stranger, inConference: false })
		).toBe(false);
		expect(readsWholePerson({ access: as('REVIEWER'), ...stranger })).toBe(false);
	});

	it('is true for team admins reading a teammate, not for participant care', () => {
		const teammate = { ...stranger, onTeam: true };
		expect(readsWholePerson({ access: as('TEAM_COORDINATOR'), ...teammate })).toBe(true);
		expect(readsWholePerson({ access: as('PARTICIPANT_CARE'), ...teammate })).toBe(false);
	});
});

describe('ageAtStart', () => {
	const startConference = new Date('2027-03-04T12:00:00Z');

	it('counts full years on the first conference day', () => {
		expect(ageAtStart({ birthday: new Date('2009-04-06'), startConference })).toEqual({
			age: 17,
			minor: true
		});
		expect(ageAtStart({ birthday: new Date('2009-02-06'), startConference })).toEqual({
			age: 18,
			minor: false
		});
	});

	it('says nothing while a day is unknown', () => {
		expect(ageAtStart({ birthday: null, startConference })).toBeUndefined();
		expect(ageAtStart({ birthday: new Date(), startConference: undefined })).toBeUndefined();
	});
});

describe('addressFacts', () => {
	const countryName = (code: string) => ({ DEU: 'Deutschland', USA: 'USA' })[code] ?? code;

	it('writes a complete address in its lines', () => {
		expect(
			addressFacts({
				address: { street: 'Lindenweg 4', zip: '24103', city: 'Kiel', country: 'DEU' },
				countryName
			})
		).toEqual({ lines: ['Lindenweg 4', '24103 Kiel', 'Deutschland'], missing: [] });
	});

	it('names what is missing', () => {
		expect(addressFacts({ address: { apartment: '1457', country: 'DEU' }, countryName })).toEqual({
			lines: ['1457', 'Deutschland'],
			missing: ['street', 'zip', 'city']
		});
	});

	it('asks for a region only where the country has one, and names it', () => {
		const facts = addressFacts({
			address: { street: 'Main St 1', zip: '94103', city: 'San Francisco', country: 'USA' },
			countryName
		});
		expect(facts.missing).toEqual(['region']);
		expect(
			addressFacts({
				address: { street: 'Main St 1', zip: '94103', city: 'SF', region: 'CA', country: 'USA' },
				countryName
			}).lines
		).toContain('California');
	});
});
