import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = { id: string; assignedDocumentNumber: number | null };

const { rows, steps, published, tx } = vi.hoisted(() => {
	/** The conference's participants as the transaction reads them. */
	const rows: Row[] = [];
	/** What was done to the database, in order. */
	const steps: (string | { set: object } | { insert: object })[] = [];
	const published: string[] = [];
	const tx = {
		query: {
			conferenceParticipant: {
				findFirst: async ({
					where
				}: {
					where: { id?: string | { ne: string }; assignedDocumentNumber?: number };
				}) => {
					steps.push('read');
					return rows.find(
						(row) =>
							(typeof where.id !== 'string' || row.id === where.id) &&
							(typeof where.id !== 'object' || row.id !== where.id.ne) &&
							(where.assignedDocumentNumber === undefined ||
								row.assignedDocumentNumber === where.assignedDocumentNumber)
					);
				}
			}
		},
		select: () => ({
			from: () => ({
				where: async () => {
					steps.push('read');
					const numbers = rows.flatMap((row) => row.assignedDocumentNumber ?? []);
					return [{ value: numbers.length > 0 ? Math.max(...numbers) : null }];
				}
			})
		}),
		update: () => ({
			set: (set: object) => {
				steps.push({ set });
				return { where: async () => undefined };
			}
		}),
		insert: () => ({
			values: (insert: object) => {
				steps.push({ insert });
				return { returning: async () => [{ id: 'new' }] };
			}
		})
	};
	return { rows, steps, published, tx };
});

vi.mock('#api/db/db', async () => ({
	db: { transaction: (run: (t: typeof tx) => unknown) => run(tx) },
	schema: await import('#api/db/schema/index')
}));
vi.mock('#api/db/lockConference', () => ({
	lockConference: async () => {
		steps.push('lock');
	}
}));
vi.mock('#api/db/whereRows', () => ({ whereRows: () => undefined }));
vi.mock('#api/pubsub', () => ({
	conferenceParticipantPubsub: {
		created: () => published.push('created'),
		updated: (id: string) => published.push(id)
	}
}));
vi.mock('#api/handlers/school/schoolService', () => ({}));

const { statusFields, upsertParticipantStatus } = await import('./conferenceParticipantService');

beforeEach(() => {
	rows.length = 0;
	steps.length = 0;
	published.length = 0;
});

describe('statusFields', () => {
	it('writes the fields given, and null keeps a field like leaving it out', () => {
		expect(
			statusFields({
				termsAndConditions: 'DONE',
				guardianConsent: null,
				mediaConsentStatus: 'PARTIALLY_ALLOWED',
				paymentStatus: 'DONE',
				didAttend: false,
				accessCardId: 'card'
			})
		).toEqual({
			termsAndConditions: 'DONE',
			guardianConsent: undefined,
			mediaConsent: undefined,
			mediaConsentStatus: 'PARTIALLY_ALLOWED',
			paymentStatus: 'DONE',
			didAttend: false
		});
	});
});

describe('the document number', () => {
	const write = (args: Parameters<typeof upsertParticipantStatus>[0]['args'], id = 'own') =>
		upsertParticipantStatus({ conferenceId: 'conference', target: { existingId: id }, args });

	it('is the one after the highest, read and written under the conference lock', async () => {
		rows.push(
			{ id: 'own', assignedDocumentNumber: null },
			{ id: 'other', assignedDocumentNumber: 7 },
			{ id: 'another', assignedDocumentNumber: 3 }
		);
		await write({ assignNextDocumentNumber: true });
		expect(steps[0]).toBe('lock');
		expect(steps.at(-1)).toMatchObject({ set: { assignedDocumentNumber: 8 } });
		expect(published).toEqual(['own']);
	});

	it('starts at 1, also for a person whose row is only made now', async () => {
		await upsertParticipantStatus({
			conferenceId: 'conference',
			target: { userId: 'user' },
			args: { assignNextDocumentNumber: true }
		});
		expect(steps.at(-1)).toMatchObject({
			insert: { assignedDocumentNumber: 1, userId: 'user', conferenceId: 'conference' }
		});
		expect(published).toEqual(['created', 'new']);
	});

	it('stays with a person who has one when the next one is asked for', async () => {
		rows.push({ id: 'own', assignedDocumentNumber: 2 }, { id: 'other', assignedDocumentNumber: 7 });
		await write({ assignNextDocumentNumber: true });
		expect(steps.at(-1)).toMatchObject({ set: { assignedDocumentNumber: undefined } });
	});

	it('can be typed in, replacing the one a person has', async () => {
		rows.push({ id: 'own', assignedDocumentNumber: 2 });
		await write({ assignedDocumentNumber: 5, assignNextDocumentNumber: false });
		expect(steps[0]).toBe('lock');
		expect(steps.at(-1)).toMatchObject({ set: { assignedDocumentNumber: 5 } });
	});

	it('can be typed in again for the person who has it', async () => {
		rows.push({ id: 'own', assignedDocumentNumber: 2 });
		await write({ assignedDocumentNumber: 2 });
		expect(steps.at(-1)).toMatchObject({ set: { assignedDocumentNumber: 2 } });
	});

	it('is refused when somebody else has it, writing nothing', async () => {
		rows.push(
			{ id: 'own', assignedDocumentNumber: null },
			{ id: 'other', assignedDocumentNumber: 7 }
		);
		await expect(write({ assignedDocumentNumber: 7 })).rejects.toMatchObject({
			extensions: { code: 'CONFLICT' }
		});
		expect(steps.filter((step) => typeof step !== 'string')).toEqual([]);
		expect(published).toEqual([]);
	});

	it('is left alone, without a lock, by a change of something else', async () => {
		await write({ termsAndConditions: 'DONE', assignedDocumentNumber: null });
		expect(steps).toEqual([
			{
				set: expect.objectContaining({
					termsAndConditions: 'DONE',
					assignedDocumentNumber: undefined
				})
			}
		]);
	});
});
