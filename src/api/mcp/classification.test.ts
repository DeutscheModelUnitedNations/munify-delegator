import { describe, expect, it } from 'vitest';
import { buildClientSchema, getNamedType, isObjectType } from 'graphql';
import { schema as introspection } from '#lib/api/rumbleClient/schema';
import { classifiedFields, classifyField, fieldClassOf } from './classification';

const schema = buildClientSchema(introspection);

/** Every leaf field of every object type an operation can reach, as `Type.field`. */
function leafFields() {
	const leaves: string[] = [];
	for (const type of Object.values(schema.getTypeMap())) {
		if (!isObjectType(type) || type.name.startsWith('__')) continue;
		if (type.name === 'Mutation' || type.name === 'Subscription') continue;
		for (const field of Object.values(type.getFields())) {
			if (!isObjectType(getNamedType(field.type))) leaves.push(`${type.name}.${field.name}`);
		}
	}
	return leaves;
}

describe('the field classification', () => {
	it('classifies every leaf field of the schema', () => {
		// A field missing here is redacted at runtime, but somebody has to decide: add it to
		// `classification.ts` as visible, aggregate or redacted.
		const unclassified = leafFields().filter((coordinate) => {
			const [typeName, fieldName] = coordinate.split('.');
			return fieldClassOf({ typeName: typeName ?? '', fieldName: fieldName ?? '' }) === undefined;
		});
		expect(unclassified).toEqual([]);
	});

	it('lists no field the schema does not have', () => {
		const known = new Set(leafFields());
		expect(classifiedFields().filter((coordinate) => !known.has(coordinate))).toEqual([]);
	});

	it('redacts what it does not know', () => {
		expect(classifyField({ typeName: 'User', fieldName: 'shoeSize' })).toBe('redacted');
		expect(classifyField({ typeName: 'NewType', fieldName: 'id' })).toBe('redacted');
	});

	it.each([
		['User', 'givenName'],
		['User', 'familyName'],
		['User', 'email'],
		['User', 'phone'],
		['User', 'birthday'],
		['User', 'street'],
		['User', 'zip'],
		['User', 'gender'],
		['User', 'pronouns'],
		['User', 'foodPreference'],
		['User', 'emergencyContacts'],
		['User', 'globalNotes'],
		['Delegation', 'motivation'],
		['Delegation', 'entryCode'],
		['Singleparticipant', 'experience'],
		['Assignmentreview', 'note'],
		['Paperreview', 'comments'],
		['School', 'contactName'],
		['School', 'contactEmail'],
		['School', 'notes'],
		['Conferenceparticipant', 'accessCardId'],
		['Conferencesupervisor', 'connectionCode'],
		['Teammemberinvitation', 'token'],
		['Emaillog', 'email']
	])('redacts %s.%s', (typeName, fieldName) => {
		expect(classifyField({ typeName, fieldName })).toBe('redacted');
	});

	it.each([
		['User', 'id'],
		['User', 'city'],
		['User', 'country'],
		['Conferenceparticipant', 'ofAgeAtConference'],
		['Conferenceparticipant', 'paymentStatus'],
		['School', 'name'],
		['School', 'city'],
		['Paperversion', 'content']
	])('shows %s.%s', (typeName, fieldName) => {
		expect(classifyField({ typeName, fieldName })).toBe('visible');
	});
});
