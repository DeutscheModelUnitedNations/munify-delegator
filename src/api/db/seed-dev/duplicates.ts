import type { Insert } from '../rows';
import { devAccounts } from '../seed-data/devAccounts';
import { makeDevAccountUser } from '../seed-data/user';
import type { ConferenceSeed } from './context';
import { addSingle } from './participants';

/**
 * A returning applicant: "Simon Beworben" (`dev-reg-single-applied`, applying now) took part in
 * the conference that is over as "Simón Beworben", with another email, phone number and address -
 * and left a care note there. The participant care persona finds the pair on the plausibility page
 * of a registration conference.
 */
const RETURNING = 'dev-reg-single-applied';
const EARLIER_ACCOUNT_ID = 'seed-earlier-account-simon';

/** The earlier account, as it was entered then. */
export function earlierAccount(): Insert<'user'> & { id: string } {
	const account = devAccounts.find((candidate) => candidate.sub === RETURNING);
	if (!account) throw new Error(`The dev account ${RETURNING} is missing`);
	const now = makeDevAccountUser(account);
	return {
		...now,
		id: EARLIER_ACCOUNT_ID,
		email: 'simon.b.2023@example.org',
		preferredUsername: 'simon-b-2023',
		givenName: 'Simón',
		phone: '+4917699887766',
		street: 'Am Alten Hafen 3',
		zip: '24103',
		city: 'Kiel',
		emergencyContacts: 'Vater: +49 431 556677',
		globalNotes:
			'Hat beim Abschlussabend mehrfach Absprachen mit dem Team ignoriert. Vor einer erneuten Zulassung bitte mit der Projektleitung sprechen.'
	};
}

/** What the matcher finds for the pair; `duplicates.test.ts` holds it to that. */
export const SEEDED_PAIR = {
	userId: RETURNING,
	candidateId: EARLIER_ACCOUNT_ID,
	score: 0.7,
	reasons: ['birthday', 'name']
};

export function addEarlierAccount(cs: ConferenceSeed) {
	cs.batch.user.push(earlierAccount());
	addSingle(cs, { userId: EARLIER_ACCOUNT_ID, applied: true });
	cs.batch.possibleDuplicate.push({ ...SEEDED_PAIR, status: 'OPEN' });
}
