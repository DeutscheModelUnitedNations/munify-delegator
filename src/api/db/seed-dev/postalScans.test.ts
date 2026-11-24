// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { changesAnything, proposePaperChange, type PostalStatus } from '#lib/paperScan/proposal';
import { devAccounts } from '../seed-data/devAccounts';
import { paperDetails, paperPages, paperPlans, type PaperPlan } from './postalScans';
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
