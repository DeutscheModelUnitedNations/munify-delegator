<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import codenmz from '#lib/helpers/codenamize.js';
	import { delegationSchoolsLabel } from '#lib/helpers/delegationSchools.js';
	import { toast } from 'svelte-sonner';
	import QuotedText from '../QuotedText.svelte';
	import AppliedBadge from './AppliedBadge.svelte';
	import WishList from './WishList.svelte';
	import InfoRow from './InfoRow.svelte';
	import { delegationWishes } from './wishes';

	/**
	 * What a delegation applied with: its entry code, texts and the roles it wished for, and its
	 * members' own schools (it keeps none of its own).
	 */
	interface Props {
		delegationId: string;
		conferenceId: string;
	}

	let { delegationId, conferenceId }: Props = $props();

	async function fetchApplication(delegationId: string, conferenceId: string) {
		const [delegation, conference] = await Promise.all([
			client.liveQuery.delegation({
				__args: { id: delegationId },
				id: true,
				entryCode: true,
				members: { school: { name: true } },
				applied: true,
				motivation: true,
				experience: true,
				appliedForRoles: {
					id: true,
					rank: true,
					role: {
						kind: true,
						name: true,
						fontAwesomeIcon: true,
						nation: { alpha2Code: true, alpha3Code: true }
					}
				}
			}),
			client.liveQuery.conference({ __args: { id: conferenceId }, id: true, state: true })
		]);
		return { delegation, conference };
	}

	const data = $derived(await fetchApplication(delegationId, conferenceId));
	const delegation = $derived(data.delegation);
	const conferenceState = $derived(data.conference.state);
	const wishes = $derived(
		delegationWishes(delegation.appliedForRoles, getFullTranslatedCountryNameFromISO3Code)
	);

	/** Saves another school for the delegation: a known one, a new name, or none. */

	async function rotateEntryCode() {
		if (!(await confirmDialog({ text: m.confirmRotateCode() }))) return;
		const promise = client.mutate.updateDelegation({
			__args: { id: delegationId, resetEntryCode: true },
			id: true,
			entryCode: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	}

	async function revokeApplication() {
		if (!(await confirmDialog({ text: m.confirmRevokeApplication(), danger: true }))) return;
		const promise = client.mutate.updateDelegation({
			__args: { id: delegationId, applied: false },
			id: true,
			applied: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	}

	const copyEntryCode = async () => {
		await navigator.clipboard.writeText(delegation.entryCode);
		toast.success(m.codeCopied());
	};
</script>

<section class="flex flex-col gap-3">
	<div class="flex flex-wrap items-center gap-3">
		<h3 class="text-lg font-bold">{m.delegation()} {codenmz(delegationId)}</h3>
		<AppliedBadge applied={delegation.applied} />
		{#if conferenceState === 'PARTICIPANT_REGISTRATION'}
			<button
				class="btn btn-ghost btn-sm text-error ml-auto"
				disabled={!delegation.applied}
				onclick={revokeApplication}
			>
				<i class="fa-sharp-duotone fa-solid fa-file-slash"></i>
				{m.revokeApplication()}
			</button>
		{/if}
	</div>

	<div class="bg-base-200 rounded-box divide-base-300 flex flex-col divide-y">
		<InfoRow title={m.schoolsOfMembers()} faIcon="school">
			<span class="text-sm">{delegationSchoolsLabel(delegation.members) ?? m.noSchoolGiven()}</span>
		</InfoRow>
		<InfoRow title={m.entryCode()} faIcon="key">
			<span class="font-mono text-sm tracking-wider">{delegation.entryCode}</span>
			{#snippet actions()}
				<div class="join">
					<button
						class="btn btn-sm join-item"
						onclick={copyEntryCode}
						aria-label={m.copy()}
						title={m.copy()}
					>
						<i class="fa-sharp-duotone fa-solid fa-copy"></i>
					</button>
					<button class="btn btn-sm join-item" onclick={rotateEntryCode}>
						<i class="fa-sharp-duotone fa-solid fa-arrow-rotate-left"></i>
						{m.rotateCode()}
					</button>
				</div>
			{/snippet}
		</InfoRow>
		<WishList {wishes} />
	</div>

	{#if delegation.motivation || delegation.experience}
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
			{#if delegation.motivation}
				<QuotedText title={m.motivation()} text={delegation.motivation} />
			{/if}
			{#if delegation.experience}
				<QuotedText title={m.experience()} text={delegation.experience} />
			{/if}
		</div>
	{/if}
</section>
