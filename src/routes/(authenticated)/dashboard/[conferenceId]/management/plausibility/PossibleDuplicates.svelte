<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import DuplicateAccount from './DuplicateAccount.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const account = {
		givenName: true,
		familyName: true,
		birthday: true,
		email: true,
		createdAt: true,
		globalNotes: true
	} as const;
	const attendance = {
		conferenceId: true,
		title: true,
		startConference: true,
		role: true
	} as const;

	const pairs = $derived(
		await client.liveQuery.conferencePossibleDuplicates({
			__args: { conferenceId },
			id: true,
			score: true,
			reasons: true,
			status: true,
			userId: true,
			candidateId: true,
			user: account,
			candidate: account,
			userAttendances: attendance,
			candidateAttendances: attendance
		})
	);

	const reasonLabels: Record<string, () => string> = {
		birthday: m.duplicateReasonBirthday,
		name: m.duplicateReasonName,
		email: m.duplicateReasonEmail,
		phone: m.duplicateReasonPhone,
		emergencyContact: m.duplicateReasonEmergencyContact,
		address: m.duplicateReasonAddress
	};

	let scanning = $state(false);

	async function scan() {
		scanning = true;
		try {
			const promise = Promise.resolve(
				client.mutate.scanPossibleDuplicates({ __args: { conferenceId } })
			);
			toast.promise(promise, {
				...genericPromiseToastMessages,
				success: (count) => m.possibleDuplicatesScanned({ count })
			});
			await promise;
		} finally {
			scanning = false;
		}
	}

	function decide(id: string, status: 'OPEN' | 'CONFIRMED' | 'DISMISSED') {
		const promise = client.mutate.decidePossibleDuplicate({ __args: { id, status }, status: true });
		toast.promise(promise, genericPromiseToastMessages);
	}
</script>

<section class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h2 class="text-2xl font-bold">{m.plausibilityPossibleDuplicates()}</h2>
		<button class="btn btn-sm" onclick={scan} disabled={scanning}>
			<i class="fa-sharp-duotone fa-solid fa-arrows-rotate {scanning ? 'fa-spin' : ''}"></i>
			{m.possibleDuplicatesScan()}
		</button>
	</div>
	<p class="text-base-content/70 max-w-3xl text-sm">{m.possibleDuplicatesDescription()}</p>

	{#each pairs as pair (pair.id)}
		<div class="card bg-base-100 border-base-200 border shadow-sm">
			<div class="card-body gap-4">
				<div class="flex flex-wrap items-center gap-2">
					<span class="badge badge-warning">
						{m.possibleDuplicateMatch({ score: Math.round(pair.score * 100) })}
					</span>
					{#each pair.reasons as reason (reason)}
						<span class="badge badge-ghost">{reasonLabels[reason]?.() ?? reason}</span>
					{/each}
					{#if pair.status === 'CONFIRMED'}
						<span class="badge badge-error">
							<i class="fa-sharp-duotone fa-solid fa-link"></i>
							{m.possibleDuplicateConfirmedBadge()}
						</span>
					{/if}
				</div>
				<div class="flex flex-col gap-4 md:flex-row">
					<DuplicateAccount
						id={pair.userId}
						account={pair.user}
						attendances={pair.userAttendances}
					/>
					<DuplicateAccount
						id={pair.candidateId}
						account={pair.candidate}
						attendances={pair.candidateAttendances}
					/>
				</div>
				<div class="card-actions justify-end">
					{#if pair.status === 'OPEN'}
						<button class="btn btn-sm" onclick={() => decide(pair.id, 'DISMISSED')}>
							<i class="fa-sharp-duotone fa-solid fa-people-arrows"></i>
							{m.possibleDuplicateDifferentPeople()}
						</button>
						<button class="btn btn-sm btn-warning" onclick={() => decide(pair.id, 'CONFIRMED')}>
							<i class="fa-sharp-duotone fa-solid fa-link"></i>
							{m.possibleDuplicateSamePerson()}
						</button>
					{:else}
						<button class="btn btn-sm btn-ghost" onclick={() => decide(pair.id, 'OPEN')}>
							<i class="fa-sharp-duotone fa-solid fa-rotate-left"></i>
							{m.possibleDuplicateReopen()}
						</button>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<p class="text-base-content/60">{m.possibleDuplicatesNone()}</p>
	{/each}
</section>
