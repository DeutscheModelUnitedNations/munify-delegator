import { faker } from '@faker-js/faker';
import type { ConferenceSeed } from './context';
import { addWaitingListEntry, nationSeats, PERSONA_NATION } from './conference';
import { addDelegation, addSingle, addSupervisor, type RolePreference } from './participants';

/**
 * Registration volume for load testing: thousands of anonymous applications per conference, on
 * top of the hand-sized crowd. Delegations have `MIN_SIZE`..`MAX_SIZE` members and hold no seat;
 * in the assigned conferences they are the applicants who did not get one. Supervisors look
 * after a few of those delegations each, the way a teacher brings their school's groups, and the
 * conferences past registration have thousands more people waiting on the list. Totals across all
 * conferences are the sum of each plan's `bulk` (about 70k delegations, 10k singles, 17k
 * supervisors and 7k waiting list entries); `SEED_BULK_SCALE` shrinks or grows all of them, `0`
 * switches the bulk off.
 */
const MIN_SIZE = 3;
const MAX_SIZE = 10;

const scale = Number(process.env.SEED_BULK_SCALE ?? 1);
if (!Number.isFinite(scale) || scale < 0) throw new Error('SEED_BULK_SCALE must be >= 0');

/** Nations ordered roomiest first, with the seats each offers; computed once per conference. */
function nationsBySeats(cs: ConferenceSeed) {
	return [...new Set(cs.committees.flatMap((committee) => committee.nations))]
		.filter((nation) => nation !== PERSONA_NATION)
		.map((nation) => ({ nation, seats: nationSeats(cs, nation) }))
		.sort((a, b) => b.seats - a.seats || a.nation.localeCompare(b.nation));
}

export function addBulk(cs: ConferenceSeed) {
	const bulk = cs.plan.crowd.bulk;
	if (!bulk) return;
	const appliedShare = cs.plan.key === 'registration' ? 0.5 : 0.85;

	const delegationMemberIds = addBulkDelegations(
		cs,
		Math.round(bulk.delegations * scale),
		appliedShare
	);

	const singleIds: string[] = [];
	for (let index = 0; index < Math.round(bulk.singles * scale); index++) {
		singleIds.push(
			addSingle(cs, {
				userId: cs.world.crowdUser('participant'),
				applied: faker.datatype.boolean(appliedShare),
				preferences: faker.helpers.arrayElements(cs.customRoleIds, { min: 1, max: 3 })
			})
		);
	}

	addBulkSupervisors(
		cs,
		Math.round((bulk.supervisors ?? 0) * scale),
		delegationMemberIds,
		singleIds
	);
	addBulkWaitingList(cs, Math.round((bulk.waitingList ?? 0) * scale));
}

/** Returns each delegation's member row ids, for the supervisors. */
function addBulkDelegations(cs: ConferenceSeed, count: number, appliedShare: number) {
	const nations = nationsBySeats(cs);
	const roomiest = nations[0]?.seats ?? 0;
	// The server drops preferences with fewer seats than members, so only offer roomy nations.
	const preferenceNations = (size: number) =>
		nations.filter((entry) => entry.seats >= Math.min(size, roomiest)).map((entry) => entry.nation);
	const pools = new Map<number, string[]>();
	for (let size = MIN_SIZE; size <= MAX_SIZE; size++) pools.set(size, preferenceNations(size));

	const delegationMemberIds: string[][] = [];
	for (let index = 0; index < count; index++) {
		const size = faker.number.int({ min: MIN_SIZE, max: MAX_SIZE });
		const pool = pools.get(size) ?? [];
		const preferences: RolePreference[] = faker.helpers
			.arrayElements(pool, { min: Math.min(3, pool.length), max: Math.min(5, pool.length) })
			.map((nation) => ({ nation }));
		// Small delegations can also ask for the first actor, which seats three.
		if (size <= 3 && cs.nonStateActorIds[0] && preferences.length > 0 && faker.datatype.boolean()) {
			preferences[preferences.length - 1] = { nonStateActorId: cs.nonStateActorIds[0] };
		}
		const { memberIds } = addDelegation(cs, {
			applied: faker.datatype.boolean(appliedShare),
			members: Array.from({ length: size }, () => ({
				userId: cs.world.crowdUser('participant')
			})),
			preferences
		});
		delegationMemberIds.push([...memberIds.values()]);
	}
	return delegationMemberIds;
}

/**
 * Supervisors, each taking the next one to four delegations and up to two singles. Some have
 * registered but nobody has linked to them yet; once the delegations run out, the rest only have
 * singles or nobody.
 */
function addBulkSupervisors(
	cs: ConferenceSeed,
	count: number,
	delegationMemberIds: string[][],
	singleIds: string[]
) {
	const delegations = faker.helpers.shuffle(delegationMemberIds);
	const singles = faker.helpers.shuffle(singleIds);
	let nextDelegation = 0;
	let nextSingle = 0;

	for (let index = 0; index < count; index++) {
		const unlinked = faker.datatype.boolean(0.15);
		const delegationCount = unlinked ? 0 : faker.number.int({ min: 1, max: 4 });
		const singleCount = unlinked ? 0 : faker.number.int({ min: 0, max: 2 });
		const students = delegations.slice(nextDelegation, nextDelegation + delegationCount);
		const ownSingles = singles.slice(nextSingle, nextSingle + singleCount);
		nextDelegation += delegationCount;
		nextSingle += singleCount;

		addSupervisor(cs, {
			userId: cs.world.crowdUser('supervisor'),
			attends: faker.datatype.boolean(0.7),
			memberIds: students.flat(),
			singleIds: ownSingles
		});
	}
}

/**
 * People who signed up for the waiting list since registration closed, oldest first. A few were
 * hidden by the team as duplicates or no-shows.
 */
function addBulkWaitingList(cs: ConferenceSeed, count: number) {
	if (count === 0) return;
	const from = new Date(cs.conference.startAssignment);
	const to = new Date(Math.min(Date.now(), cs.startConference.getTime()));
	const signedUpAt = faker.date.betweens({ from, to, count });

	for (const createdAt of signedUpAt) {
		addWaitingListEntry(cs, cs.world.crowdUser('participant'), {
			createdAt,
			hidden: faker.datatype.boolean(0.03)
		});
	}
}
