import { describe, expect, test, vi } from 'vitest';

vi.mock('$app/env/private', () => ({ CERTIFICATE_SECRET: 'a secret that only this test uses' }));

/** The conference as the service reads it. */
const conference: { documentLayouts: unknown } = { documentLayouts: null };
vi.mock('#api/db/db', () => ({
	db: { query: { conference: { findFirst: async () => conference } } }
}));

const { issueCertificateCode, issueLiveCode, issuePrintCodes, scannedUserId, verifyCode } =
	await import('./signedCodeService');
const { decodeAreas } = await import('#lib/paperScan/areas');
const { defaultLayout } = await import('#lib/helpers/documentLayout');

const A4 = { width: 595, height: 842 };
const issuePrintCode = async ({ now }: { now?: number } = {}) => {
	const [code] = await issuePrintCodes({
		userId: 'alice',
		conferenceId: 'mun',
		pages: [{ document: 'contract', page: 0, ...A4 }],
		now
	});
	return code;
};

const NOW = Date.UTC(2026, 10, 8, 9, 0, 0);

describe('issued codes', () => {
	test('a nametag code verifies and names its holder and conference', async () => {
		const code = await issueLiveCode({ userId: 'alice', conferenceId: 'mun', now: NOW });
		expect(await verifyCode({ text: code, now: NOW + 1000 })).toMatchObject({
			valid: true,
			claims: { kind: 'live', userId: 'alice', conferenceId: 'mun' }
		});
	});

	test('a certificate code states what was certified', async () => {
		const certificate = { n: 'Ada', t: 'MUN', s: 1, e: 2 };
		const code = await issueCertificateCode({ certificate, now: NOW });
		expect(await verifyCode({ text: code, now: NOW })).toMatchObject({
			valid: true,
			claims: { kind: 'certificate', certificate }
		});
	});

	test('the keys survive a restart: a code issued before still verifies', async () => {
		const code = await issuePrintCode({ now: NOW });
		vi.resetModules();
		const reloaded = await import('./signedCodeService');
		expect(await reloaded.verifyCode({ text: code })).toMatchObject({ valid: true });
	});
});

describe('the codes of the application documents', () => {
	test('one per page, each carrying the fields on its page', async () => {
		const pages = [
			{ document: 'mediaConsent', page: 0, ...A4 },
			{ document: 'mediaConsent', page: 1, ...A4 },
			{ document: 'contract', page: 0, ...A4 }
		] as const;
		const codes = await issuePrintCodes({ userId: 'alice', conferenceId: 'mun', pages });
		const areas = await Promise.all(
			codes.map(async (code) => {
				const checked = await verifyCode({ text: code });
				if (!checked.valid || checked.claims.kind !== 'print') throw new Error('not a print code');
				return checked.claims.areas && decodeAreas(checked.claims.areas);
			})
		);
		expect(areas[0]?.areas.map((area) => area.field)).toEqual([
			'mediaPhoto',
			'mediaVideo',
			'mediaByDmun',
			'mediaByOthers'
		]);
		expect(areas[0]?.page.width).toBeCloseTo(210, 0);
		expect(areas[0]?.markers).toHaveLength(4);
		expect(areas[1]?.areas).toHaveLength(8);
		expect(areas[2]?.areas.map((area) => area.field)).toEqual([
			'termsAccepted',
			'termsPlaceDate',
			'termsSignature'
		]);
	});

	test("a page without fields carries none; a test print's layout stands in for the stored one", async () => {
		const read = async (code: string) => {
			const checked = await verifyCode({ text: code });
			if (!checked.valid || checked.claims.kind !== 'print') throw new Error('not a print code');
			return checked.claims.areas && decodeAreas(checked.claims.areas);
		};
		// the contract's signature moved to its (template's) second page
		const layouts = {
			contract: {
				...defaultLayout('contract'),
				termsSignature: { x: 0.1, y: 0.8, width: 0.4, height: 0.03, page: 1 }
			}
		};
		conference.documentLayouts = layouts;
		const pages = [
			{ document: 'contract', page: 0, ...A4 },
			{ document: 'contract', page: 1, ...A4 },
			{ document: 'contract', page: 2, ...A4 }
		] as const;
		const [first, second, third] = await issuePrintCodes({
			userId: 'alice',
			conferenceId: 'mun',
			pages
		});
		expect((await read(first))?.areas.map(({ field }) => field)).toEqual([
			'termsAccepted',
			'termsPlaceDate'
		]);
		expect((await read(second))?.areas.map(({ field }) => field)).toEqual(['termsSignature']);
		expect(await read(third)).toBeUndefined();

		const [draft] = await issuePrintCodes({
			userId: 'alice',
			conferenceId: 'mun',
			pages: [pages[0]],
			draft: { layouts: null }
		});
		expect((await read(draft))?.areas).toHaveLength(3);
		conference.documentLayouts = null;
	});
});

describe('the user a scan leads to', () => {
	test('a genuine code of an accepted kind leads to its holder', async () => {
		const code = await issueLiveCode({ userId: 'alice', conferenceId: 'mun' });
		expect(await scannedUserId({ code, conferenceId: 'mun', kinds: ['live'] })).toBe('alice');
	});

	test('anything that is no signed code is the user id it is', async () => {
		expect(await scannedUserId({ code: 'alice', conferenceId: 'mun', kinds: ['live'] })).toBe(
			'alice'
		);
	});

	test('a code of another kind or conference is refused', async () => {
		const code = await issuePrintCode();
		await expect(scannedUserId({ code, conferenceId: 'mun', kinds: ['live'] })).rejects.toThrow();
		await expect(
			scannedUserId({ code, conferenceId: 'other', kinds: ['print'] })
		).rejects.toThrow();
	});

	test('an expired nametag code is refused', async () => {
		const code = await issueLiveCode({
			userId: 'alice',
			conferenceId: 'mun',
			now: Date.now() - 60 * 60 * 1000
		});
		await expect(scannedUserId({ code, conferenceId: 'mun', kinds: ['live'] })).rejects.toThrow();
	});
});
