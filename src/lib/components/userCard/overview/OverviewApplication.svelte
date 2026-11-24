<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import AppliedBadge from '../sections/AppliedBadge.svelte';
	import { delegationWishes } from '../sections/wishes';

	/** Where the application stands: sent off or waiting, and the roles it wished for. */
	interface Props {
		userId: string;
		conferenceId: string;
		delegationId: string | undefined;
		singleParticipantId: string | undefined;
	}

	let { userId, conferenceId, delegationId, singleParticipantId }: Props = $props();

	async function fetchWaiting({ userId, conferenceId }: { userId: string; conferenceId: string }) {
		return client.liveQuery.waitingListEntries({
			__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } },
			createdAt: true,
			assignedAt: true
		});
	}

	async function fetchDelegation(id: string | undefined) {
		return id === undefined
			? undefined
			: client.liveQuery.delegation({
					__args: { id },
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
				});
	}

	async function fetchSingle(id: string | undefined) {
		return id === undefined
			? undefined
			: client.liveQuery.singleParticipant({
					__args: { id },
					applied: true,
					appliedForRoles: { id: true, name: true }
				});
	}

	const [waiting, delegation, single] = $derived(
		await Promise.all([
			fetchWaiting({ userId, conferenceId }),
			fetchDelegation(delegationId),
			fetchSingle(singleParticipantId)
		])
	);

	const application = $derived(delegation ?? single);
	const entry = $derived(waiting.find(({ assignedAt }) => !assignedAt));
	const wishes = $derived(
		delegation
			? delegationWishes({
					applications: delegation.appliedForRoles,
					countryName: getFullTranslatedCountryNameFromISO3Code
				}).map(({ id, label }) => ({ id, label }))
			: (single?.appliedForRoles ?? []).map(({ id, name }) => ({ id, label: name ?? 'N/A' }))
	);
</script>

{#if entry}
	<p>
		{m.waitingListSince()}
		{entry.createdAt.toLocaleDateString(getLocale(), { dateStyle: 'medium' })}
	</p>
{/if}
{#if application}
	<div><AppliedBadge applied={application.applied} /></div>
	{#if wishes.length > 0}
		<ol class="list-decimal pl-5" aria-label={m.appliedForRoles()}>
			{#each wishes as wish (wish.id)}
				<li>{wish.label}</li>
			{/each}
		</ol>
	{/if}
{/if}
