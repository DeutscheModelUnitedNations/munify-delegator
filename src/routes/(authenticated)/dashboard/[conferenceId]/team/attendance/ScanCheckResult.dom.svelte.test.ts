import { afterEach, describe, expect, test, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { m } from '#lib/paraglide/messages';
import type { FoundPerson } from './scanLoad';
import type { ShownPerson } from './attendanceSession';

vi.mock('#lib/api/rumbleClient/client', () => ({ client: {} }));
vi.mock('#lib/components/userCard/userCardState.svelte.js', () => ({ openUserCard: () => {} }));

const { default: ScanCheckResult } = await import('./ScanCheckResult.svelte');

const person: FoundPerson = {
	user: { id: 'ada', givenName: 'Ada', familyName: 'Lovelace', birthday: null },
	inConference: true,
	roles: {
		isHeadDelegate: false,
		isSupervisor: false,
		isTeamMember: false,
		isWaitingList: false,
		nationAlpha2Code: null,
		nationAlpha3Code: null,
		nonStateActorName: null,
		nonStateActorIcon: null,
		committeeAbbreviation: null,
		singleRoleName: null
	},
	status: {
		didAttend: false,
		paymentStatus: 'DONE',
		termsAndConditions: 'DONE',
		guardianConsent: 'DONE'
	},
	accessCardId: 'CARD-1',
	missingSurveyOptions: [],
	check: { issues: [], passed: true, mayRecordAnyway: true }
};

describe('ScanCheckResult', () => {
	let target: HTMLElement;
	let app: ReturnType<typeof mount> | undefined;

	function show(awaiting: ShownPerson['awaiting']) {
		target = document.body.appendChild(document.createElement('div'));
		const onConfirm = vi.fn();
		const onClose = vi.fn();
		app = mount(ScanCheckResult, {
			target,
			props: {
				person,
				canEdit: false,
				awaiting,
				badgeInput: person.accessCardId ?? '',
				busy: false,
				onConfirm,
				onClose,
				onRecordAnyway: () => {},
				onChanged: async () => {}
			}
		});
		flushSync();
		return { onConfirm, onClose };
	}

	const cardField = () => target.querySelector<HTMLInputElement>('input[type="text"]');
	const press = (key: string) =>
		cardField()?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

	afterEach(() => {
		if (app) unmount(app);
		target.remove();
	});

	test('asks for the access card with the one the person carries, ready to type', () => {
		show('badge');
		expect(cardField()?.value).toBe('CARD-1');
		expect(document.activeElement).toBe(cardField());
		expect(target.textContent).toContain(m.scanWaitsForBadge());
	});

	test('Enter stores the card, Escape gives it up', () => {
		const { onConfirm, onClose } = show('badge');
		press('Enter');
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onClose).not.toHaveBeenCalled();
		press('Escape');
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	test.each(['ack', 'decide', null] as const)('asks for no card when awaiting %s', (awaiting) => {
		show(awaiting);
		expect(cardField()).toBeNull();
	});
});
