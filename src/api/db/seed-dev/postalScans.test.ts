// @vitest-environment node
import { readBarcodes } from 'zxing-wasm/reader';
import { describe, expect, test } from 'vitest';
import { locateMarkers } from '#lib/paperScan/markers';
import { readPageOfCode, zonesOfCode } from '#lib/paperScan/readScan';
import { renderPdfPage } from '#lib/paperScan/scanSimulation';
import { changesAnything, proposePaperChange, type PostalStatus } from '#lib/paperScan/proposal';
import { devAccounts } from '../seed-data/devAccounts';
import { paperDetails, paperPages, paperPlans, scannedPage, type PaperPlan } from './postalScans';
import { personaStatuses } from './personas';

const NOTHING_IN: PostalStatus = {
	termsAndConditions: 'PENDING',
	guardianConsent: 'PENDING',
	mediaConsent: 'PENDING',
	mediaConsentStatus: 'NOT_SET'
};

const scansOf = async (plan: PaperPlan) => {
	const pages = await paperPages({ plan, layouts: undefined });
	return { pages, details: paperDetails({ plan, pages }) };
};

const scanned = (['PREPARATION', 'ACTIVE', 'POST'] as const).flatMap((state) =>
	paperPlans(state).map((paper) => ({ state, ...paper }))
);

describe.each(scanned)('$state: the paper of $userId', ({ state, userId, plan }) => {
	test('has the guardians where the account is a minor', () => {
		const account = devAccounts.find(({ sub }) => sub === userId);
		const age = account && 'age' in account ? account.age : undefined;
		expect(age).toBeDefined();
		expect(plan.minor ?? false).toBe((age ?? 19) < 18);
	});

	test('makes the statuses the persona has', async () => {
		const { details } = await scansOf(plan);
		const minor = plan.minor ?? false;
		const { change } = proposePaperChange({
			readings: details.map(({ field, state: read }) => ({ field, state: read })),
			status: NOTHING_IN,
			confirm: false,
			minor
		});
		expect(changesAnything(change)).toBe(true);
		const status = personaStatuses(state)[userId];
		expect(change.termsAndConditions === 'DONE').toBe(status?.termsAndConditions === 'DONE');
		expect(change.mediaConsent === 'DONE').toBe(status?.mediaConsent === 'DONE');
		expect(change.mediaConsentStatus ?? 'NOT_SET').toBe(status?.mediaConsentStatus);
		// an adult's documents have none, and the team ticks it off
		if (minor) {
			expect(change.guardianConsent === 'DONE').toBe(status?.guardianConsent === 'DONE');
		}
	});
});

test('the scans show every source, state and kind of page', async () => {
	const papers = await Promise.all(
		paperPlans('PREPARATION').map(async ({ plan }) => ({ plan, ...(await scansOf(plan)) }))
	);
	const details = papers.flatMap((paper) => paper.details);
	expect(new Set(details.map(({ state }) => state))).toEqual(new Set(['yes', 'no', 'unclear']));
	expect(new Set(details.map(({ source }) => source))).toEqual(new Set(['SCAN', 'MANUAL']));
	expect(papers.some(({ pages }) => pages.some(({ readings }) => readings === null))).toBe(true);
	expect(papers.some(({ plan }) => plan.extraPage)).toBe(true);
	const everywhere = [...paperPlans('PREPARATION'), ...paperPlans('ACTIVE')];
	expect(new Set(everywhere.map(({ plan }) => plan.source))).toEqual(
		new Set(['UPLOAD', 'FOLDER', 'WEBDAV'])
	);
});

test('a seeded scan reads as what the seed says was read, its fields found where they are', async () => {
	process.env.CERTIFICATE_SECRET ??= 'seed test secret';
	const plan: PaperPlan = { source: 'WEBDAV', read: { termsSignature: 'no' } };
	const [page] = await paperPages({ plan, layouts: undefined });
	const scan = await scannedPage({
		scanned: page,
		userId: 'dev-delegate',
		conferenceId: 'conference',
		issuedAt: 1_800_000_000,
		angle: 1.2,
		asPicture: false
	});
	const picture = await renderPdfPage({ bytes: scan.bytes, dpi: 150 });
	const [code] = await readBarcodes(
		{
			data: new Uint8ClampedArray(picture.data),
			width: picture.width,
			height: picture.height,
			colorSpace: 'srgb'
		},
		{ formats: ['QRCode'], tryHarder: true }
	);
	const located = locateMarkers(picture);
	expect(readPageOfCode({ picture, code: code.text, located })).toEqual(page.readings);
	const zones = zonesOfCode({ code: code.text, located });
	expect(zones?.map(({ field }) => field)).toEqual(page.areas.map(({ field }) => field));
	for (const { corners } of zones ?? []) {
		for (const { x, y } of corners) {
			expect(x).toBeGreaterThan(0);
			expect(x).toBeLessThan(picture.width);
			expect(y).toBeGreaterThan(0);
			expect(y).toBeLessThan(picture.height);
		}
	}
	// prints, renders and reads a whole page: a second locally, several on CI's runners
}, 60_000);
