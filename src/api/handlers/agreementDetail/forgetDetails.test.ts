// @vitest-environment node
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { makeSeedConference } from '#api/db/seed-data/conference';
import { makeSeedUser } from '#api/db/seed-data/user';

/**
 * What scans told goes when it was refused, on a real database: runs with `TEST_DATABASE_URL`, a migrated
 * database to write to (what it adds it removes), and is skipped without.
 */
const url = vi.hoisted(() => process.env.TEST_DATABASE_URL);

vi.mock('$app/env/private', () => ({
	DATABASE_URL: url,
	DATABASE_POOL_SIZE: 4,
	LOG_LEVEL: 'silent',
	NODE_ENV: 'test',
	CERTIFICATE_SECRET: 'a secret that only this test uses'
}));
vi.mock('$app/env', () => ({ building: false, dev: false }));

const { announced } = vi.hoisted(() => ({ announced: vi.fn() }));
vi.mock('#api/pubsub', () => {
	const silent = { created: () => undefined, updated: () => undefined, removed: () => undefined };
	return {
		agreementDetailPubsub: { ...silent, removed: announced },
		conferenceParticipantPubsub: silent,
		postalScanPubsub: silent,
		storedFilePubsub: silent
	};
});
vi.mock('#api/handlers/school/schoolService', () => ({}));
vi.mock('#api/handlers/signedCode/signedCodeService', () => ({}));

const CONFERENCE = 'forget-test';
const USER = 'forget-test-user';
const PARTICIPANT = 'forget-test-participant';

describe.skipIf(!url)('details read off scans', () => {
	const load = async () => ({
		...(await import('#api/db/db')),
		...(await import('./agreementDetailService')),
		...(await import('#api/handlers/postalScan/postalScanService')),
		...(await import('#api/handlers/conferenceParticipant/conferenceParticipantService'))
	});

	async function clean() {
		const { db, schema } = await load();
		await db
			.delete(schema.conferenceParticipant)
			.where(eq(schema.conferenceParticipant.id, PARTICIPANT));
		await db.delete(schema.conference).where(eq(schema.conference.id, CONFERENCE));
		await db.delete(schema.user).where(eq(schema.user.id, USER));
		await db.delete(schema.storedFile).where(eq(schema.storedFile.purpose, CONFERENCE));
	}

	beforeEach(async () => {
		await clean();
		announced.mockReset();
		const { db, schema } = await load();
		await db.insert(schema.user).values({ ...makeSeedUser(), id: USER });
		await db.insert(schema.conference).values({ ...makeSeedConference(), id: CONFERENCE });
		await db
			.insert(schema.conferenceParticipant)
			.values({ id: PARTICIPANT, userId: USER, conferenceId: CONFERENCE });
		const detail = { conferenceParticipantId: PARTICIPANT, state: 'yes', source: 'SCAN' } as const;
		await db.insert(schema.agreementDetail).values([
			{ ...detail, field: 'termsAccepted' },
			{ ...detail, field: 'termsPlaceDate', source: 'MANUAL' },
			{ ...detail, field: 'termsSignature' },
			{ ...detail, field: 'mediaPhoto' }
		]);
	});
	afterAll(clean);

	const details = async () => {
		const { db } = await load();
		const rows = await db.query.agreementDetail.findMany({
			where: { conferenceParticipantId: PARTICIPANT },
			columns: { field: true }
		});
		return rows.map(({ field }) => field).sort();
	};
	const ALL = ['mediaPhoto', 'termsAccepted', 'termsPlaceDate', 'termsSignature'];

	const mark = async (status: 'DONE' | 'PROBLEM' | 'PENDING') => {
		const { upsertParticipantStatus } = await load();
		await upsertParticipantStatus({
			conferenceId: CONFERENCE,
			target: { existingId: PARTICIPANT },
			args: { termsAndConditions: status }
		});
	};

	test('go when their document is newly marked as a problem, but what a person set', async () => {
		await mark('DONE');
		expect(await details()).toEqual(ALL);
		expect(announced).not.toHaveBeenCalled();
		await mark('PROBLEM');
		expect(await details()).toEqual(['mediaPhoto', 'termsPlaceDate']);
		expect(announced).toHaveBeenCalledOnce();
	});

	test('read since stay while it still is one, and do not make it in again', async () => {
		const { applyPaperReadings, db } = await load();
		await mark('PROBLEM');
		const fields = ['termsAccepted', 'termsSignature'] as const;
		const { notes } = await applyPaperReadings({
			participantId: PARTICIPANT,
			readings: fields.map((field) => ({ field, state: 'yes' })),
			confirm: false
		});
		expect(notes).toEqual([{ kind: 'rejected', document: 'contract' }]);
		const row = await db.query.conferenceParticipant.findFirst({ where: { id: PARTICIPANT } });
		expect(row?.termsAndConditions).toBe('PROBLEM');
		await mark('PROBLEM');
		expect(await details()).toEqual(ALL);
	});

	test('go with the only scan that told them', async () => {
		const { db, schema, deletePostalScan } = await load();
		const scan = async (id: string, fields: ('termsAccepted' | 'termsSignature')[]) => {
			const file = { id, key: id, purpose: CONFERENCE, mimeType: 'application/pdf', size: 1 };
			await db.insert(schema.storedFile).values(file);
			await db.insert(schema.postalScan).values({
				id,
				conferenceParticipantId: PARTICIPANT,
				fileId: id,
				source: 'UPLOAD',
				pageKey: id,
				fields,
				readings: fields.map((field) => ({ field, state: 'yes' }))
			});
		};
		await scan('forget-test-both', ['termsAccepted', 'termsSignature']);
		await scan('forget-test-one', ['termsSignature']);
		await deletePostalScan('forget-test-both');
		expect(await details()).toEqual(['mediaPhoto', 'termsPlaceDate', 'termsSignature']);
		await deletePostalScan('forget-test-one');
		expect(await details()).toEqual(['mediaPhoto', 'termsPlaceDate']);
		expect(announced).toHaveBeenCalledTimes(2);
		// one that is gone already changes nothing
		await deletePostalScan('forget-test-one');
		expect(announced).toHaveBeenCalledTimes(2);
	});
});
