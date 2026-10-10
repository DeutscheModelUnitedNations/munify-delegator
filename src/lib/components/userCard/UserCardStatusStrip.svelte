<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';

	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	type AdministrativeStatus = 'DONE' | 'PROBLEM' | 'PENDING';

	const statuses = $derived(
		await client.liveQuery.conferenceParticipantStatuses({
			__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } },
			id: true,
			paymentStatus: true,
			termsAndConditions: true,
			didAttend: true,
			accessCardId: true
		})
	);
	const status = $derived(statuses.at(0));

	const tone: Record<AdministrativeStatus, { badge: string; icon: string }> = {
		DONE: { badge: 'badge-success', icon: 'fa-check' },
		PENDING: { badge: 'badge-warning', icon: 'fa-hourglass-half' },
		PROBLEM: { badge: 'badge-error', icon: 'fa-triangle-exclamation' }
	};

	const copyCard = async (accessCardId: string) => {
		await navigator.clipboard.writeText(accessCardId);
		toast.success(m.codeCopied());
	};
</script>

{#snippet administrative(title: string, value: AdministrativeStatus)}
	<span class="badge badge-soft gap-1.5 {tone[value].badge}">
		<i class="fa-sharp-duotone fa-solid {tone[value].icon} text-xs"></i>
		{title}
	</span>
{/snippet}

<div class="flex flex-wrap items-center gap-2 text-sm">
	{#if status?.accessCardId}
		{@const accessCardId = status.accessCardId}
		<button
			class="hover:text-primary flex cursor-pointer items-center gap-1.5 font-mono transition-colors"
			onclick={() => copyCard(accessCardId)}
			title="{m.accessCardId()} · {m.copy()}"
		>
			<i class="fa-sharp-duotone fa-solid fa-id-card"></i>
			{accessCardId}
		</button>
	{:else}
		<span class="text-base-content/60 flex items-center gap-1.5">
			<i class="fa-sharp-duotone fa-solid fa-id-card"></i>
			{m.noAccessCard()}
		</span>
	{/if}

	{#if status}
		{@render administrative(m.payment(), status.paymentStatus)}
		{@render administrative(m.userAgreement(), status.termsAndConditions)}
		<span class="badge badge-soft gap-1.5 {status.didAttend ? 'badge-success' : 'badge-neutral'}">
			<i
				class="fa-sharp-duotone fa-solid {status.didAttend
					? 'fa-calendar-check'
					: 'fa-calendar'} text-xs"
			></i>
			{m.attendance()}
		</span>
	{/if}
</div>
