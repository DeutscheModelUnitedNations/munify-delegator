import { describe, expect, test, vi } from 'vitest';

vi.mock('#api/db/db', () => ({ db: {} }));

const { numberContacts } = await import('./chatContacts');

const role = (id: string) => ({
	id,
	kind: 'NATION' as const,
	nationAlpha3Code: id,
	nation: { alpha2Code: id.slice(0, 2) },
	name: null,
	abbreviation: null,
	icon: null
});
const ga = { id: 'ga', abbreviation: 'GA', name: 'General Assembly' };
const person = ({
	participantId,
	roleId,
	committee = ga
}: {
	participantId: string;
	roleId: string;
	committee?: typeof ga | null;
}) => ({
	participantId,
	userId: `u-${participantId}`,
	suspended: false,
	delegationId: `d-${roleId}`,
	role: role(roleId),
	committee
});

describe('numberContacts', () => {
	test('leaves a person alone in their role and committee without a number', () => {
		const [contact] = numberContacts([person({ participantId: 'p1', roleId: 'deu' })]);
		expect(contact?.ordinal).toBeNull();
	});

	test('numbers the people sharing a role and committee, in the order of their ids', () => {
		const contacts = numberContacts([
			person({ participantId: 'p9', roleId: 'deu' }),
			person({ participantId: 'p2', roleId: 'deu' }),
			person({ participantId: 'p5', roleId: 'deu', committee: null }),
			person({ participantId: 'p1', roleId: 'fra' })
		]);
		const ordinalOf = (id: string) =>
			contacts.find((contact) => contact.participantId === id)?.ordinal;
		expect(ordinalOf('p2')).toBe(1);
		expect(ordinalOf('p9')).toBe(2);
		// the same role in another committee (or none) is somebody else
		expect(ordinalOf('p5')).toBeNull();
		expect(ordinalOf('p1')).toBeNull();
	});

	test('gives the same people the same numbers whatever order they arrive in', () => {
		const people = [
			person({ participantId: 'b', roleId: 'deu' }),
			person({ participantId: 'a', roleId: 'deu' })
		];
		const numbers = (list: typeof people) =>
			Object.fromEntries(numberContacts(list).map((c) => [c.participantId, c.ordinal]));
		expect(numbers(people)).toEqual(numbers([...people].reverse()));
	});
});
