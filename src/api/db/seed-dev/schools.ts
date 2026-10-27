import { faker } from '@faker-js/faker';
import type { SeedBatch } from './batch';

/**
 * The schools every conference of the seed draws from. Schools are shared across conferences, so
 * one pool serves them all; the draw favours the first schools of the pool, so a few schools send
 * many people - enough to pass the per-school seat limit - and most send a handful. Some schools
 * carry the details the team keeps (address, contact, notes).
 */
const POOL_SIZE = 120;
const pools = new WeakMap<SeedBatch, string[]>();

function poolOf(batch: SeedBatch) {
	const known = pools.get(batch);
	if (known) return known;
	const ids = Array.from({ length: POOL_SIZE }, (_, index) => {
		const id = faker.database.mongodbObjectId();
		const city = faker.location.city();
		const detailed = index % 4 === 0;
		batch.school.push({
			id,
			name: `${faker.helpers.arrayElement(['Gymnasium', 'Gesamtschule', 'Berufskolleg', 'Schule am'])} ${faker.helpers.arrayElement([city, faker.person.lastName()])}`,
			city,
			country: 'DEU',
			...(detailed
				? {
						street: faker.location.streetAddress(),
						zip: faker.location.zipCode('#####'),
						contactName: faker.person.fullName(),
						contactEmail: faker.internet.email(),
						contactPhone: faker.phone.number({ style: 'international' }),
						notes: faker.helpers.maybe(() => faker.lorem.sentence()) ?? null
					}
				: {})
		});
		return id;
	});
	pools.set(batch, ids);
	return ids;
}

/** A school of the pool, the popular ones more often. */
export function seedSchoolId(batch: SeedBatch) {
	const pool = poolOf(batch);
	return pool[Math.floor(pool.length * faker.number.float() ** 2.5)] ?? pool[0];
}

/**
 * As if the assignment had merged two delegations: in every conference, the second member of the
 * first seated delegation whose people have a school comes from another school, so the seats per
 * school count people rather than delegations. Everyone else got their school as they registered.
 */
export function addMergedMembers(batch: SeedBatch) {
	const participants = new Map(batch.conferenceParticipant.map((p) => [p.id, p]));
	const schoolOfMember = (member: SeedBatch['delegationMember'][number] | undefined) =>
		member ? participants.get(member.conferenceParticipantId)?.schoolId : undefined;
	const membersOf = Map.groupBy(batch.delegationMember, (m) => m.delegationId);
	const seated = batch.delegation.filter(
		(d) => d.assignedRoleId && schoolOfMember(membersOf.get(d.id ?? '')?.[0])
	);
	const firstPerConference = new Map(seated.toReversed().map((d) => [d.conferenceId, d]));
	for (const delegation of firstPerConference.values()) {
		const [first, second] = membersOf.get(delegation.id ?? '') ?? [];
		const moved = second && participants.get(second.conferenceParticipantId);
		const school = schoolOfMember(first);
		if (moved) moved.schoolId = poolOf(batch).find((id) => id !== school) ?? null;
	}
}
