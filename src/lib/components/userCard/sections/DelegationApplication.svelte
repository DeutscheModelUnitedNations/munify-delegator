<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import { toast } from 'svelte-sonner';
	import ApplicationReview from './ApplicationReview.svelte';
	import ApplicationTexts from './ApplicationTexts.svelte';
	import AppliedBadge from './AppliedBadge.svelte';
	import WishList from './WishList.svelte';
	import Section from '../ui/Section.svelte';
	import { delegationWishes, type Wish } from './wishes';

	/**
	 * What a delegation applied with, in its own words too, and what the team made of it.
	 */
	interface Props {
		delegationId: string;
		conferenceId: string;
	}

	let { delegationId, conferenceId }: Props = $props();

	async function fetchApplication({
		delegationId,
		conferenceId
	}: {
		delegationId: string;
		conferenceId: string;
	}) {
		const [delegation, conference] = await Promise.all([
			client.liveQuery.delegation({
				__args: { id: delegationId },
				id: true,
				applied: true,
				appliedForRoles: {
					id: true,
					rank: true,
					role: {
						kind: true,
						name: true,
						icon: true,
						nation: { alpha2Code: true, alpha3Code: true }
					}
				}
			}),
			client.liveQuery.conference({ __args: { id: conferenceId }, id: true, state: true })
		]);
		return { delegation, conference };
	}

	const data = $derived(await fetchApplication({ delegationId, conferenceId }));
	const delegation = $derived(data.delegation);
	const conferenceState = $derived(data.conference.state);
	const wishes = $derived(
		delegationWishes({
			applications: delegation.appliedForRoles,
			countryName: getFullTranslatedCountryNameFromISO3Code
		})
	);

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

	let changingWishes = $state(false);

	/** Runs one change of the wishes with its toast; the buttons wait meanwhile. */
	async function changeWishes(change: () => Promise<unknown>) {
		changingWishes = true;
		try {
			const promise = change();
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
		} finally {
			changingWishes = false;
		}
	}

	const removeWish = (wish: Wish) =>
		changeWishes(() =>
			Promise.resolve(client.mutate.deleteRoleApplication({ __args: { id: wish.id } }))
		);

	const moveWishUp = (wish: Wish, above: Wish) =>
		changeWishes(() =>
			Promise.resolve(
				client.mutate.swapRoleApplicationRanks({
					__args: { firstRoleApplicationId: wish.id, secondRoleApplicationId: above.id },
					id: true,
					rank: true
				})
			)
		);
</script>

<Section icon="note-pencil" title={m.userCardTabRegistration()} columns>
	{#snippet actions()}
		<AppliedBadge applied={delegation.applied} />
		{#if conferenceState === 'PARTICIPANT_REGISTRATION'}
			<button
				class="btn btn-ghost btn-sm text-error"
				disabled={!delegation.applied}
				onclick={revokeApplication}
			>
				<i aria-hidden="true" class="ph-duotone ph-file-x text-lg"></i>
				{m.revokeApplication()}
			</button>
		{/if}
	{/snippet}
	<div class="min-w-0">
		<WishList {wishes} onRemove={removeWish} onMoveUp={moveWishUp} busy={changingWishes} />
		<ApplicationReview {conferenceId} applicationId={delegationId} kind="delegation" />
	</div>
	<ApplicationTexts {delegationId} />
</Section>
