import { beforeEach, describe, expect, test, vi } from 'vitest';

// Nothing fills the app's variables in under vitest, and validating them refuses the empty set.
vi.mock('$app/env/private', () => ({ DATABASE_URL: '', REDIS_URL: undefined }));

const { writes, published, tx, stored } = vi.hoisted(() => {
	/** The conference row `updateConference` reads and writes, and what other tables hold. */
	const stored: { row: Record<string, unknown>; content: Record<string, boolean> } = {
		row: {},
		content: {}
	};
	/** What the transaction inserted, in order. */
	const writes: object[] = [];
	const published: string[] = [];
	/** The nations there are rows for, by alpha-2. */
	const nations = [
		{ alpha2Code: 'de', alpha3Code: 'deu' },
		{ alpha2Code: 'fr', alpha3Code: 'fra' }
	];
	const tx = {
		query: {
			nation: {
				findMany: async () => nations,
				findFirst: async ({ where }: { where: { alpha2Code: string } }) =>
					nations.find(({ alpha2Code }) => alpha2Code === where.alpha2Code)
			},
			conferenceRole: {
				findFirst: async ({ where }: { where: { nationAlpha3Code: string } }) => ({
					id: `role-${where.nationAlpha3Code}`
				})
			},
			committeeAgendaItem: {
				findFirst: async () => (stored.content.agendaItem ? { id: 'a' } : undefined)
			},
			calendarDay: {
				findFirst: async () => (stored.content.calendarDay ? { id: 'd' } : undefined)
			},
			guideOutline: {
				findFirst: async () => (stored.content.guide ? { id: 'g' } : undefined)
			}
		},
		select: () => ({
			from: () => ({ where: () => ({ for: async () => [{ ...stored.row }] }) })
		}),
		update: () => ({
			set: (values: Record<string, unknown>) => ({
				where: () => ({
					returning: async () => {
						const given = Object.entries(values).filter(([, value]) => value !== undefined);
						stored.row = { ...stored.row, ...Object.fromEntries(given) };
						return [{ ...stored.row }];
					}
				})
			})
		}),
		insert: () => ({
			values: (row: { abbreviation?: string }) => {
				writes.push(row);
				const written = [{ id: row.abbreviation ?? 'conference' }];
				return {
					returning: async () => written,
					onConflictDoNothing: async () => undefined
				};
			}
		})
	};
	return { writes, published, tx, stored };
});

vi.mock('#api/db/db', async () => ({
	db: { query: tx.query, transaction: (run: (t: typeof tx) => unknown) => run(tx) },
	schema: await import('#api/db/schema/index')
}));
vi.mock('#api/pubsub', () => ({
	conferencePubsub: {
		created: () => published.push('conference'),
		updated: () => published.push('conference updated')
	},
	committeePubsub: { created: () => published.push('committee') },
	conferenceRolePubsub: { created: () => published.push('role') }
}));
vi.mock('#api/handlers/storedFile/storedFileService', () => ({ ensureUploadComplete: vi.fn() }));

const { seedConference, updateConference } = await import('./conferenceService');

const conference = {
	title: 'MUN',
	longTitle: 'Model United Nations',
	location: 'Kiel',
	website: 'https://example.org',
	language: 'de',
	applicationDeadline: new Date('2026-01-01'),
	startConference: new Date('2026-02-01'),
	endConference: new Date('2026-02-04')
};
const committee = (abbreviation: string, nations: string[]) => ({
	name: abbreviation,
	abbreviation,
	nations,
	numOfSeatsPerDelegation: 1
});
const seed = (committees: ReturnType<typeof committee>[]) =>
	seedConference({
		$schema: '',
		conference,
		nsa: [{ name: 'Ocean', abbreviation: 'OC', seatAmount: 1, description: '', icon: 'fish' }],
		committees,
		customConferenceRole: [{ name: 'Press', description: '', icon: 'camera', seatAmount: 2 }]
	});

beforeEach(() => {
	writes.length = 0;
	published.length = 0;
});

describe('seedConference', () => {
	test('creates the conference with its roles, committees and seated nations', async () => {
		expect(await seed([committee('GA', ['DE', 'FR']), committee('SC', [])])).toBe('conference');
		expect(writes).toMatchObject([
			{ title: 'MUN' },
			{ conferenceId: 'conference', kind: 'NON_STATE_ACTOR', name: 'Ocean' },
			{ conferenceId: 'conference', kind: 'CUSTOM', name: 'Press' },
			{ conferenceId: 'conference', abbreviation: 'GA' },
			{ conferenceId: 'conference', kind: 'NATION', nationAlpha3Code: 'deu' },
			{ a: 'GA', b: 'role-deu' },
			{ conferenceId: 'conference', kind: 'NATION', nationAlpha3Code: 'fra' },
			{ a: 'GA', b: 'role-fra' },
			{ conferenceId: 'conference', abbreviation: 'SC' }
		]);
		expect(published).toEqual(['conference', 'committee', 'role']);
	});

	test('refuses nations there are no rows for, naming them all', async () => {
		const refused = seed([committee('GA', ['DE', 'XX']), committee('SC', ['YY'])]);
		await expect(refused).rejects.toMatchObject({
			message: expect.stringContaining('GA: XX, SC: YY'),
			extensions: { code: 'INVALID_INPUT' }
		});
		expect(writes).toEqual([]);
		expect(published).toEqual([]);
	});
});

describe('updateConference', () => {
	const nothingSetUp = {
		applicationDeadline: conference.applicationDeadline,
		startConference: conference.startConference,
		endConference: conference.endConference,
		participantMinAge: null,
		participantMaxAge: null,
		unlockPayments: false,
		unlockPostals: false,
		isOpenPaperSubmission: false,
		showCalendar: false,
		messagingEnabled: false,
		guidePublished: false,
		feeAmount: null,
		currency: null,
		bankAccountHolder: null,
		iban: null,
		postalName: null,
		postalStreet: null,
		postalZip: null,
		postalCity: null,
		postalCountry: null,
		contractFileId: null,
		guardianConsentFileId: null,
		mediaConsentFileId: null,
		termsAndConditionsFileId: null
	};
	const bankDetails = {
		feeAmount: 75,
		currency: 'EUR',
		bankAccountHolder: 'DMUN e.V.',
		iban: 'DE89370400440532013000'
	};

	beforeEach(() => {
		stored.row = { ...nothingSetUp };
		stored.content = {};
	});

	test('refuses switching payments on without the bank details', async () => {
		await expect(updateConference({ id: 'c', unlockPayments: true })).rejects.toMatchObject({
			extensions: { code: 'CONFLICT' }
		});
		expect(published).toEqual([]);
	});

	test('setting the bank details up and switching payments on in one change passes', async () => {
		await updateConference({ id: 'c', unlockPayments: true, ...bankDetails });
		expect(stored.row.unlockPayments).toBe(true);
		expect(published).toEqual(['conference updated']);
	});

	test('refuses taking the IBAN away while payments are on; switching off with it passes', async () => {
		stored.row = { ...nothingSetUp, ...bankDetails, unlockPayments: true };
		await expect(updateConference({ id: 'c', iban: null })).rejects.toMatchObject({
			extensions: { code: 'CONFLICT' }
		});
		await updateConference({ id: 'c', unlockPayments: false, iban: null });
		expect(stored.row).toMatchObject({ unlockPayments: false, iban: null });
	});

	test('reads agenda items, calendar days and the guide from their tables', async () => {
		await expect(updateConference({ id: 'c', showCalendar: true })).rejects.toMatchObject({
			extensions: { code: 'CONFLICT' }
		});
		stored.content = { agendaItem: true, calendarDay: true, guide: true };
		await updateConference({
			id: 'c',
			showCalendar: true,
			isOpenPaperSubmission: true,
			guidePublished: true,
			messagingEnabled: true
		});
		expect(stored.row).toMatchObject({ showCalendar: true, guidePublished: true });
	});
});
