import {
	findDuplicates,
	type MatchProfile,
	type MatchReason
} from '../../handlers/possibleDuplicate/duplicateMatching';
import { devAccounts, type DevAccountSub } from '../seed-data/devAccounts';
import { makeDevAccountUser } from '../seed-data/user';
import type * as schema from '../schema';
import type { ConferenceKey } from './plans';

/**
 * The ways a returning person's data can differ from the account they were noted on, and the
 * states a pair can be in - each as a small scenario of accounts, so the plausibility page, the
 * user card badge and the read rules can be tried on every one of them. Pure: the seed builds its
 * rows from this, and `duplicates.test.ts` holds every scenario to what the matcher really finds,
 * so the seeded pairs are never hand-written guesses.
 *
 * The rows themselves (users, who took part where) are written by `duplicates.ts`.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface Person {
	givenName: string;
	familyName: string;
	birthday: Date;
	email: string;
	phone: string;
	emergencyContacts: string;
	street: string;
	zip: string;
	city: string;
}

export type Participation = {
	/** `registration` is the conference whose plausibility page shows the pairs. */
	at: Extract<ConferenceKey, 'registration' | 'post' | 'elsewhere'>;
	as: 'single' | 'delegate' | 'supervisor' | 'waitingList';
	/** Delegates with the same group join one delegation. */
	group?: string;
};

export interface Account {
	/** Unique within the scenario; refers to the account in `expect`. */
	name: string;
	/** A dev account is used as it is seeded (its row and its part in `registration` exist). */
	devAccount?: DevAccountSub;
	person: Person;
	/** The care note on the account (`user.globalNotes`). */
	note?: string;
	/** How old the account is. */
	sinceDays: number;
	took: Participation[];
}

export type DecisionStatus = 'OPEN' | 'DISMISSED' | 'CONFIRMED';

export interface ExpectedPair {
	a: string;
	b: string;
	reasons: MatchReason[];
	status?: DecisionStatus;
	/**
	 * The matcher does not find this pair (any more), yet the row exists: a profile was corrected
	 * after the pair was stored. A scan drops it while it is open and keeps it once decided.
	 */
	stale?: boolean;
}

export interface Scenario {
	key: string;
	/** What differs between the accounts, for the console overview. */
	summary: string;
	accounts: Account[];
	/** Every pair the matcher finds among the scenario's accounts - and nothing else. */
	expect: ExpectedPair[];
}

// --- building people --------------------------------------------------------------------------

const bornOn = ({ year, month, day }: { year: number; month: number; day: number }) =>
	new Date(Date.UTC(year, month - 1, day));

/** A person as they were entered back then; `n` keeps every scenario's data apart from the rest. */
function person({
	n,
	givenName,
	familyName,
	birthday
}: {
	n: number;
	givenName: string;
	familyName: string;
	birthday: Date;
}): Person {
	return {
		givenName,
		familyName,
		birthday,
		email: `seed${n}.old@example.org`,
		phone: `+49152${String(10_000_000 + n * 1013)}`,
		emergencyContacts: `Mutter: +49170${String(3_000_000 + n * 17)}`,
		street: `Seedstraße ${n}`,
		zip: String(30_000 + n * 11),
		city: 'Hannover'
	};
}

/** The same person with a fresh signup's contact details; `changes` sets what else differs. */
function renewed({
	base,
	n,
	changes = {}
}: {
	base: Person;
	n: number;
	changes?: Partial<Person>;
}): Person {
	return {
		...base,
		email: `seed${n}.new@mail.example`,
		phone: `+49157${String(20_000_000 + n * 1013)}`,
		emergencyContacts: `Mutter: +49171${String(4_000_000 + n * 17)}`,
		street: `Neuweg ${n}`,
		zip: String(40_000 + n * 11),
		city: 'Braunschweig',
		...changes
	};
}

const NOTE =
	'Hat Absprachen mit dem Team mehrfach ignoriert. Vor einer Zulassung bitte Rücksprache.';

const earlierAt = ({
	at,
	as = 'single'
}: {
	at: Participation['at'];
	as?: Participation['as'];
}) => [{ at, as }];
const currentSingle: Participation[] = [{ at: 'registration', as: 'single' }];

function devPerson({
	sub,
	changes = {}
}: {
	sub: DevAccountSub;
	changes?: Partial<Person>;
}): Person {
	const account = devAccounts.find((candidate) => candidate.sub === sub);
	const row = account && makeDevAccountUser(account);
	if (!row?.birthday) throw new Error(`The dev account ${sub} needs a complete profile`);
	return {
		givenName: row.givenName,
		familyName: row.familyName,
		birthday: row.birthday,
		email: row.email,
		phone: row.phone ?? '',
		emergencyContacts: row.emergencyContacts ?? '',
		street: row.street ?? '',
		zip: row.zip ?? '',
		city: row.city ?? '',
		...changes
	};
}

// --- the scenarios ----------------------------------------------------------------------------

const simon = 'dev-reg-single-applied';
const jurgen = person({
	n: 2,
	givenName: 'Jürgen',
	familyName: 'Müller',
	birthday: bornOn({ year: 2008, month: 3, day: 14 })
});
const lena = person({
	n: 3,
	givenName: 'Lena',
	familyName: 'Schmidt',
	birthday: bornOn({ year: 2009, month: 5, day: 2 })
});
const anna = person({
	n: 4,
	givenName: 'Anna Maria',
	familyName: 'Fischer',
	birthday: bornOn({ year: 2008, month: 9, day: 21 })
});
const matthias = person({
	n: 5,
	givenName: 'Matthias',
	familyName: 'Hoffmann',
	birthday: bornOn({ year: 2007, month: 11, day: 30 })
});
const dmitry = person({
	n: 6,
	givenName: 'Дмитрий',
	familyName: 'Иванов',
	birthday: bornOn({ year: 2008, month: 1, day: 9 })
});
const xiaolong = person({
	n: 7,
	givenName: '小龙',
	familyName: '李',
	birthday: bornOn({ year: 2009, month: 7, day: 17 })
});
const sophie = person({
	n: 8,
	givenName: 'Sophie',
	familyName: 'Wagner',
	birthday: bornOn({ year: 2008, month: 4, day: 25 })
});
const alexander = person({
	n: 9,
	givenName: 'Alexander',
	familyName: 'Koch',
	birthday: bornOn({ year: 2007, month: 2, day: 11 })
});
const hannah = person({
	n: 10,
	givenName: 'Hannah',
	familyName: 'Neumann',
	birthday: bornOn({ year: 2009, month: 10, day: 6 })
});
const julia = person({
	n: 11,
	givenName: 'Julia',
	familyName: 'Brandt',
	birthday: bornOn({ year: 2008, month: 12, day: 1 })
});
const paul = person({
	n: 12,
	givenName: 'Paul',
	familyName: 'Lange',
	birthday: bornOn({ year: 2009, month: 6, day: 28 })
});
const jonas = person({
	n: 13,
	givenName: 'Jonas',
	familyName: 'Richter',
	birthday: bornOn({ year: 2008, month: 8, day: 8 })
});
const mia = {
	...person({
		n: 14,
		givenName: 'Mia',
		familyName: 'Richter',
		birthday: bornOn({ year: 2010, month: 3, day: 19 })
	}),
	...pick(jonas)
};
const lea = person({
	n: 15,
	givenName: 'Lea',
	familyName: 'Schulz',
	birthday: bornOn({ year: 2009, month: 1, day: 23 })
});
const lenaSchulz = {
	...person({ n: 16, givenName: 'Lena', familyName: 'Schulz', birthday: lea.birthday }),
	...pick(lea)
};
const emilia = person({
	n: 17,
	givenName: 'Emilia',
	familyName: 'Vogel',
	birthday: bornOn({ year: 2008, month: 2, day: 3 })
});
const felix = person({
	n: 18,
	givenName: 'Felix',
	familyName: 'Zimmermann',
	birthday: bornOn({ year: 2007, month: 9, day: 12 })
});
const katrin = person({
	n: 19,
	givenName: 'Katrin',
	familyName: 'Lehmann',
	birthday: bornOn({ year: 1985, month: 6, day: 15 })
});
const oskar = person({
	n: 20,
	givenName: 'Oskar',
	familyName: 'Braun',
	birthday: bornOn({ year: 2008, month: 11, day: 4 })
});
const ida = person({
	n: 21,
	givenName: 'Ida',
	familyName: 'Krause',
	birthday: bornOn({ year: 2009, month: 4, day: 27 })
});
const noah = person({
	n: 22,
	givenName: 'Noah',
	familyName: 'Klein',
	birthday: bornOn({ year: 2008, month: 7, day: 7 })
});
const luca = person({ n: 23, givenName: 'Luca', familyName: 'Braun', birthday: noah.birthday });
const schneiderA = person({
	n: 24,
	givenName: 'Maximilian',
	familyName: 'Schneider',
	birthday: bornOn({ year: 2008, month: 5, day: 16 })
});
const schneiderB = person({
	n: 25,
	givenName: 'Maximilian',
	familyName: 'Schneider',
	birthday: bornOn({ year: 2009, month: 12, day: 12 })
});

/** The household a pair of siblings or twins shares: the parents' number and the address. */
function pick(of: Person): Pick<Person, 'emergencyContacts' | 'street' | 'zip' | 'city'> {
	return {
		emergencyContacts: of.emergencyContacts,
		street: of.street,
		zip: of.zip,
		city: of.city
	};
}

export const duplicateScenarios: Scenario[] = [
	{
		key: 'returning-persona',
		summary:
			'a dev account (dev-reg-single-applied) had an earlier account with a care note; new email, phone, address, "Simón" -> "Simon"',
		accounts: [
			{
				name: 'earlier',
				person: devPerson({
					sub: simon,
					changes: {
						givenName: 'Simón',
						email: 'simon.b.2023@example.org',
						phone: '+4917699887766',
						emergencyContacts: 'Vater: +49 431 556677',
						street: 'Am Alten Hafen 3',
						zip: '24103',
						city: 'Kiel'
					}
				}),
				note: NOTE,
				sinceDays: 700,
				took: earlierAt({ at: 'post' })
			},
			{
				name: 'current',
				devAccount: simon,
				person: devPerson({ sub: simon }),
				sinceDays: 20,
				took: []
			}
		],
		expect: [{ a: 'earlier', b: 'current', reasons: ['birthday', 'name'] }]
	},
	{
		key: 'umlaut',
		summary: 'Jürgen Müller -> Juergen Mueller: umlauts written out where a keyboard lacks them',
		accounts: [
			{
				name: 'earlier',
				person: jurgen,
				note: NOTE,
				sinceDays: 800,
				took: earlierAt({ at: 'post' })
			},
			{
				name: 'current',
				person: renewed({
					base: jurgen,
					n: 2,
					changes: { givenName: 'Juergen', familyName: 'Mueller' }
				}),
				sinceDays: 10,
				took: currentSingle
			}
		],
		expect: [{ a: 'earlier', b: 'current', reasons: ['birthday', 'name'] }]
	},
	{
		key: 'swapped-names',
		summary:
			'Lena Schmidt -> "Schmidt Lena": family name entered first. The earlier account is from a conference of other organizers',
		accounts: [
			{
				name: 'earlier',
				person: lena,
				note: NOTE,
				sinceDays: 400,
				took: earlierAt({ at: 'elsewhere', as: 'delegate' })
			},
			{
				name: 'current',
				person: renewed({
					base: lena,
					n: 3,
					changes: { givenName: 'Schmidt', familyName: 'Lena' }
				}),
				sinceDays: 12,
				took: currentSingle
			}
		],
		expect: [{ a: 'earlier', b: 'current', reasons: ['birthday', 'name'] }]
	},
	{
		key: 'second-given-name',
		summary: 'Anna Maria Fischer -> Anna Fischer: a second given name left out; no care note',
		accounts: [
			{ name: 'earlier', person: anna, sinceDays: 600, took: earlierAt({ at: 'post' }) },
			{
				name: 'current',
				person: renewed({ base: anna, n: 4, changes: { givenName: 'Anna' } }),
				sinceDays: 9,
				took: currentSingle
			}
		],
		expect: [{ a: 'earlier', b: 'current', reasons: ['birthday', 'name'] }]
	},
	{
		key: 'typo-confirmed',
		summary:
			'Matthias Hoffmann -> Mathias Hofmann: typos in both names. Participant care confirmed it is the same person',
		accounts: [
			{
				name: 'earlier',
				person: matthias,
				note: NOTE,
				sinceDays: 420,
				took: earlierAt({ at: 'elsewhere' })
			},
			{
				name: 'current',
				person: renewed({
					base: matthias,
					n: 5,
					changes: { givenName: 'Mathias', familyName: 'Hofmann' }
				}),
				sinceDays: 8,
				took: currentSingle
			}
		],
		expect: [{ a: 'earlier', b: 'current', reasons: ['birthday', 'name'], status: 'CONFIRMED' }]
	},
	{
		key: 'cyrillic',
		summary: 'Дмитрий Иванов -> Dmitry Ivanov: another script, compared after transliteration',
		accounts: [
			{
				name: 'earlier',
				person: dmitry,
				note: NOTE,
				sinceDays: 410,
				took: earlierAt({ at: 'elsewhere' })
			},
			{
				name: 'current',
				person: renewed({
					base: dmitry,
					n: 6,
					changes: { givenName: 'Dmitry', familyName: 'Ivanov' }
				}),
				sinceDays: 7,
				took: currentSingle
			}
		],
		expect: [{ a: 'earlier', b: 'current', reasons: ['birthday', 'name'] }]
	},
	{
		key: 'chinese',
		summary: '小龙 李 -> Xiaolong Li: Chinese characters against pinyin',
		accounts: [
			{ name: 'earlier', person: xiaolong, sinceDays: 500, took: earlierAt({ at: 'post' }) },
			{
				name: 'current',
				person: renewed({
					base: xiaolong,
					n: 7,
					changes: { givenName: 'Xiaolong', familyName: 'Li' }
				}),
				sinceDays: 6,
				took: currentSingle
			}
		],
		expect: [{ a: 'earlier', b: 'current', reasons: ['birthday', 'name'] }]
	},
	{
		key: 'email-variant',
		summary:
			'sophie.wagner@gmail.com -> sophie.wagner+mun@gmail.com with the birthday corrected by a day: found by email and name',
		accounts: [
			{
				name: 'earlier',
				person: { ...sophie, email: 'sophie.wagner@gmail.com' },
				note: NOTE,
				sinceDays: 650,
				took: earlierAt({ at: 'post' })
			},
			{
				name: 'current',
				person: renewed({
					base: sophie,
					n: 8,
					changes: {
						email: 'sophie.wagner+mun@gmail.com',
						birthday: bornOn({ year: 2008, month: 4, day: 24 })
					}
				}),
				sinceDays: 5,
				took: currentSingle
			}
		],
		expect: [{ a: 'earlier', b: 'current', reasons: ['email', 'name'] }]
	},
	{
		key: 'nickname-phone',
		summary:
			'Alexander Koch -> Alex Koch, another birthday: the phone number (written differently) and the name carry it',
		accounts: [
			{
				name: 'earlier',
				person: { ...alexander, phone: '+49 152 1234 5678' },
				sinceDays: 380,
				took: earlierAt({ at: 'elsewhere' })
			},
			{
				name: 'current',
				person: renewed({
					base: alexander,
					n: 9,
					changes: {
						givenName: 'Alex',
						birthday: bornOn({ year: 2007, month: 2, day: 12 }),
						phone: '+4915212345678'
					}
				}),
				sinceDays: 4,
				took: currentSingle
			}
		],
		expect: [{ a: 'earlier', b: 'current', reasons: ['phone', 'name'] }]
	},
	{
		key: 'parents-number',
		summary: 'Hannah Neumann -> Hanna Neumann with the parents’ number kept',
		accounts: [
			{
				name: 'earlier',
				person: hannah,
				note: NOTE,
				sinceDays: 550,
				took: earlierAt({ at: 'post' })
			},
			{
				name: 'current',
				person: renewed({
					base: hannah,
					n: 10,
					changes: {
						givenName: 'Hanna',
						emergencyContacts: hannah.emergencyContacts
					}
				}),
				sinceDays: 3,
				took: currentSingle
			}
		],
		expect: [{ a: 'earlier', b: 'current', reasons: ['birthday', 'emergencyContact', 'name'] }]
	},
	{
		key: 'new-name-same-household',
		summary:
			'Julia Brandt -> Julia Berg: a different family name, found by birthday, parents’ number and address',
		accounts: [
			{
				name: 'earlier',
				person: julia,
				note: NOTE,
				sinceDays: 520,
				took: earlierAt({ at: 'post' })
			},
			{
				name: 'current',
				person: renewed({ base: julia, n: 11, changes: { familyName: 'Berg', ...pick(julia) } }),
				sinceDays: 2,
				took: currentSingle
			}
		],
		expect: [{ a: 'earlier', b: 'current', reasons: ['birthday', 'emergencyContact', 'address'] }]
	},
	{
		key: 'nothing-left',
		summary:
			'Paul Lange -> Pablo Berger, other birthday, new address: only the parents’ number is the same. NOT found - the limit of the check',
		accounts: [
			{
				name: 'earlier',
				person: paul,
				note: NOTE,
				sinceDays: 500,
				took: earlierAt({ at: 'post' })
			},
			{
				name: 'current',
				person: renewed({
					base: paul,
					n: 12,
					changes: {
						givenName: 'Pablo',
						familyName: 'Berger',
						birthday: bornOn({ year: 2009, month: 6, day: 29 }),
						emergencyContacts: paul.emergencyContacts
					}
				}),
				sinceDays: 2,
				took: currentSingle
			}
		],
		expect: []
	},
	{
		key: 'siblings',
		summary:
			'Jonas and Mia Richter: same family name, parents and address, other birthdays. Not flagged',
		accounts: [
			{
				name: 'brother',
				person: jonas,
				note: NOTE,
				sinceDays: 450,
				took: earlierAt({ at: 'post' })
			},
			{ name: 'sister', person: mia, sinceDays: 15, took: currentSingle }
		],
		expect: []
	},
	{
		key: 'twins-dismissed',
		summary:
			'Lea and Lena Schulz, twins in one delegation: they look like one person, and participant care dismissed the pair',
		accounts: [
			{
				name: 'lea',
				person: lea,
				sinceDays: 30,
				took: [{ at: 'registration', as: 'delegate', group: 'twins' }]
			},
			{
				name: 'lena',
				person: lenaSchulz,
				sinceDays: 30,
				took: [{ at: 'registration', as: 'delegate', group: 'twins' }]
			}
		],
		expect: [
			{
				a: 'lea',
				b: 'lena',
				reasons: ['birthday', 'emergencyContact', 'address', 'name'],
				status: 'DISMISSED'
			}
		]
	},
	{
		key: 'three-accounts',
		summary:
			'Emilia Vogel has had three accounts: "Emilie" (a conference of other organizers, with a note), "Emilia Vogl", and now "Emilia Fogel"',
		accounts: [
			{
				name: 'oldest',
				person: { ...emilia, givenName: 'Emilie' },
				note: NOTE,
				sinceDays: 900,
				took: earlierAt({ at: 'elsewhere' })
			},
			{
				name: 'middle',
				person: renewed({
					base: emilia,
					n: 17,
					changes: {
						familyName: 'Vogl',
						email: 'emilia.vogl@mail.example',
						phone: emilia.phone
					}
				}),
				sinceDays: 400,
				took: earlierAt({ at: 'post' })
			},
			{
				name: 'current',
				person: renewed({ base: emilia, n: 117, changes: { familyName: 'Vogl' } }),
				sinceDays: 3,
				took: currentSingle
			}
		],
		expect: [
			{ a: 'oldest', b: 'middle', reasons: ['birthday', 'phone', 'name'] },
			{ a: 'oldest', b: 'current', reasons: ['birthday', 'name'] },
			{ a: 'middle', b: 'current', reasons: ['birthday', 'name'] }
		]
	},
	{
		key: 'note-only',
		summary:
			'Felix Zimmermann -> Zimmerman: the earlier account never took part, it was only on a waiting list - its care note is why it is compared at all',
		accounts: [
			{
				name: 'earlier',
				person: felix,
				note: NOTE,
				sinceDays: 430,
				took: earlierAt({ at: 'elsewhere', as: 'waitingList' })
			},
			{
				name: 'current',
				person: renewed({ base: felix, n: 18, changes: { familyName: 'Zimmerman' } }),
				sinceDays: 6,
				took: currentSingle
			}
		],
		expect: [{ a: 'earlier', b: 'current', reasons: ['birthday', 'name'] }]
	},
	{
		key: 'returning-supervisor',
		summary: 'Katrin Lehmann, a supervisor, signs up again with a new school email; no note',
		accounts: [
			{
				name: 'earlier',
				person: renewed({ base: katrin, n: 19, changes: { email: 'k.lehmann@schule-a.example' } }),
				sinceDays: 800,
				took: earlierAt({ at: 'post', as: 'supervisor' })
			},
			{
				name: 'current',
				person: { ...katrin, email: 'katrin.lehmann@schule-b.example' },
				sinceDays: 14,
				took: [{ at: 'registration', as: 'supervisor' }]
			}
		],
		expect: [{ a: 'earlier', b: 'current', reasons: ['birthday', 'name'] }]
	},
	{
		key: 'stale-open',
		summary:
			'Oskar Braun: a pair that was found, then one profile was corrected and it no longer matches. Still open - a scan drops it',
		accounts: [
			{
				name: 'earlier',
				person: oskar,
				note: NOTE,
				sinceDays: 460,
				took: earlierAt({ at: 'post' })
			},
			{
				name: 'current',
				person: renewed({
					base: oskar,
					n: 20,
					changes: { givenName: 'Ole', birthday: bornOn({ year: 2008, month: 11, day: 5 }) }
				}),
				sinceDays: 5,
				took: currentSingle
			}
		],
		expect: [{ a: 'earlier', b: 'current', reasons: ['birthday', 'name'], stale: true }]
	},
	{
		key: 'stale-confirmed',
		summary:
			'Ida Krause: confirmed as one person, then a profile was corrected. A scan keeps a decided pair',
		accounts: [
			{ name: 'earlier', person: ida, note: NOTE, sinceDays: 470, took: earlierAt({ at: 'post' }) },
			{
				name: 'current',
				person: renewed({
					base: ida,
					n: 21,
					changes: { givenName: 'Inga', birthday: bornOn({ year: 2009, month: 4, day: 28 }) }
				}),
				sinceDays: 5,
				took: currentSingle
			}
		],
		expect: [
			{
				a: 'earlier',
				b: 'current',
				reasons: ['birthday', 'name'],
				status: 'CONFIRMED',
				stale: true
			}
		]
	},
	{
		key: 'birthday-only',
		summary: 'Noah Klein and Luca Braun share a birthday and nothing else. Not flagged',
		accounts: [
			{ name: 'noah', person: noah, sinceDays: 440, took: earlierAt({ at: 'post' }) },
			{ name: 'luca', person: luca, sinceDays: 11, took: currentSingle }
		],
		expect: []
	},
	{
		key: 'common-name',
		summary:
			'Two Maximilian Schneiders with other birthdays and contact details; one carries a note. Not flagged',
		accounts: [
			{
				name: 'a',
				person: schneiderA,
				note: NOTE,
				sinceDays: 480,
				took: earlierAt({ at: 'post' })
			},
			{ name: 'b', person: schneiderB, sinceDays: 13, took: currentSingle }
		],
		expect: []
	}
];

// --- derived ----------------------------------------------------------------------------------

export function accountId({ scenario, account }: { scenario: Scenario; account: Account }) {
	return account.devAccount ?? `seed-dup-${scenario.key}-${account.name}`;
}

export function profileOf({
	id,
	account: { person: p }
}: {
	id: string;
	account: Account;
}): MatchProfile {
	return {
		id,
		givenName: p.givenName,
		familyName: p.familyName,
		birthday: p.birthday,
		email: p.email,
		phone: p.phone,
		emergencyContacts: p.emergencyContacts,
		street: p.street,
		zip: p.zip,
		country: 'DEU'
	};
}

/** The user rows the scenarios need; a dev account's exists already. */
export function scenarioUsers(): (typeof schema.user.$inferInsert & { id: string })[] {
	return duplicateScenarios.flatMap((scenario) =>
		scenario.accounts
			.filter((account) => !account.devAccount)
			.map((account) => {
				const id = accountId({ scenario, account });
				const since = new Date(Date.now() - account.sinceDays * DAY_MS);
				return {
					id,
					email: account.person.email,
					givenName: account.person.givenName,
					familyName: account.person.familyName,
					preferredUsername: id,
					locale: 'de',
					birthday: account.person.birthday,
					phone: account.person.phone,
					street: account.person.street,
					zip: account.person.zip,
					city: account.person.city,
					country: 'DEU',
					gender: 'NO_STATEMENT' as const,
					foodPreference: 'OMNIVORE' as const,
					emergencyContacts: account.person.emergencyContacts,
					globalNotes: account.note ?? null,
					createdAt: since,
					updatedAt: since
				};
			})
	);
}

/**
 * The pairs to store: what the matcher finds among the scenario accounts, with the decisions the
 * scenarios declare - plus the stale ones, which it does not find.
 */
export function scenarioPairs(): (typeof schema.possibleDuplicate.$inferInsert)[] {
	const profiles = duplicateScenarios.flatMap((scenario) =>
		scenario.accounts.map((account) => profileOf({ id: accountId({ scenario, account }), account }))
	);
	const found = new Map(
		findDuplicates({ scanned: profiles, pool: profiles }).map((pair) => [
			`${pair.userId}|${pair.candidateId}`,
			pair
		])
	);

	return duplicateScenarios.flatMap((scenario) => {
		const ids = new Map(
			scenario.accounts.map((account) => [account.name, accountId({ scenario, account })])
		);
		return scenario.expect.map((expected) => {
			const [a, b] = [ids.get(expected.a), ids.get(expected.b)];
			if (!a || !b)
				throw new Error(`${scenario.key}: unknown account in ${expected.a}/${expected.b}`);
			const [userId, candidateId] = a < b ? [a, b] : [b, a];
			const match = found.get(`${userId}|${candidateId}`);
			const status = expected.status ?? 'OPEN';
			return {
				userId,
				candidateId,
				score: match?.score ?? 0.7,
				reasons: match?.reasons ?? expected.reasons,
				status,
				...(status === 'OPEN'
					? {}
					: { decidedById: 'dev-team-care', decidedAt: new Date(Date.now() - 2 * DAY_MS) })
			};
		});
	});
}
