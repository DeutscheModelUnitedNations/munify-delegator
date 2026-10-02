/**
 * Wipes the dev database and fills it with every state the app can show (`bun run db:seed:dev`).
 *
 * Eight conferences cover the life of a conference: before registration, three moments of the
 * registration window, preparation with and without its steps unlocked, the running conference
 * and the time after it (`seed-dev/plans.ts`). In them, the accounts on the oidc-mock login page
 * (`seed-data/devAccounts.ts`) each play one role: the team roles in every conference, the
 * application stages in the registration conferences, and the participant roles - delegates,
 * single participants, supervisors, rejected applicants - from preparation onwards. Around them
 * an anonymous crowd provides the volume tables, statistics and assignment tools need.
 *
 * The overview printed at the end says which account to sign in with for what.
 */
import { faker } from '@faker-js/faker';
import { drizzle } from 'drizzle-orm/node-postgres';
import { reset } from 'drizzle-seed';
import * as schema from './schema';
import { unMemberNations } from './seed-data/nations';
import { makeDevAccountUser, makeSeedUser } from './seed-data/user';
import { devAccounts } from './seed-data/devAccounts';
import { pdfTemplate } from './seed-data/content';
import { emptyBatch, insertBatch } from './seed-dev/batch';
import type { CrowdKind, SeedWorld } from './seed-dev/context';
import { addCrowd, addWaitingList, buildConferenceStructure } from './seed-dev/conference';
import { addAssignedPersonas, addRegistrationPersonas } from './seed-dev/personas';
import { addReviewerSnippets, addTeam } from './seed-dev/team';
import { addPapers } from './seed-dev/papers';
import { addSurveys } from './seed-dev/surveys';
import { addCalendar } from './seed-dev/calendar';
import { printOverview } from './seed-dev/overview';
import { conferencePlans } from './seed-dev/plans';

// Run outside SvelteKit, so the connection string comes straight off the process rather than
// through `$config/private`.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');
const db = drizzle(databaseUrl);

// A fixed faker seed keeps the generated data identical between runs (dates aside, which are
// relative to now so every stage stays where it belongs).
faker.seed(123);

const CROWD_AGES: Record<CrowdKind, [number, number]> = {
	participant: [14, 20],
	supervisor: [25, 62],
	team: [18, 30]
};

const batch = emptyBatch();
batch.nation.push(...unMemberNations());

const world: SeedWorld = {
	batch,
	nations: batch.nation.map((nation) => nation.alpha3Code),
	crowdUser(kind, options = {}) {
		const [minAge, maxAge] = options.ages ?? CROWD_AGES[kind];
		const user = makeSeedUser({ minAge, maxAge, incomplete: options.incomplete });
		batch.user.push(user);
		return user.id;
	}
};

for (const account of devAccounts) {
	if (account.profile !== 'none') batch.user.push(makeDevAccountUser(account));
}
addReviewerSnippets(batch);

const templates = {
	contract: await pdfTemplate('Teilnahmevertrag'),
	guardianConsent: await pdfTemplate('Einverständniserklärung der Erziehungsberechtigten'),
	mediaConsent: await pdfTemplate('Einwilligung zu Foto- und Filmaufnahmen'),
	termsAndConditions: await pdfTemplate('Teilnahmebedingungen'),
	certificate: await pdfTemplate('Teilnahmezertifikat')
};

for (const plan of conferencePlans) {
	const cs = buildConferenceStructure(world, plan, templates);
	addTeam(cs);
	// Personas before the crowd: their fixed codes and nation are reserved first.
	if (plan.assigned) addAssignedPersonas(cs);
	else addRegistrationPersonas(cs);
	addCrowd(cs);
	addWaitingList(cs, 'dev-waitlist');
	addPapers(cs);
	addSurveys(cs);
	addCalendar(cs);
}

console.info('Resetting database...');
await reset(db, schema);
console.info(`Inserting ${batch.user.length} users and ${conferencePlans.length} conferences...`);
await insertBatch(db, batch);

printOverview();
process.exit(0);
