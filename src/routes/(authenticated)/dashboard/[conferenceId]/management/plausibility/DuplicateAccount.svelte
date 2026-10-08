<script lang="ts">
	import formatNames from '$lib/helpers/formatNames';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import { m } from '$lib/paraglide/messages';

	/** One side of a possible duplicate: who it is, where it took part, and what was noted. */
	interface Props {
		id: string;
		account: {
			givenName: string;
			familyName: string;
			birthday: Date | null;
			email: string;
			createdAt: Date;
			globalNotes: string | null;
		};
		attendances: { conferenceId: string; title: string; startConference: Date; role: string }[];
	}

	let { id, account, attendances }: Props = $props();

	const roleLabels: Record<string, () => string> = {
		DELEGATION_MEMBER: m.delegationMember,
		SINGLE_PARTICIPANT: m.singleParticipant,
		SUPERVISOR: m.supervisor
	};
</script>

<div class="bg-base-200 rounded-box flex flex-1 flex-col gap-3 p-4">
	<div class="flex items-start justify-between gap-2">
		<div>
			<p class="font-bold">{formatNames(account.givenName, account.familyName)}</p>
			<p class="text-base-content/60 text-sm">{account.email}</p>
		</div>
		<button class="btn btn-sm btn-ghost" onclick={() => openUserCard(id)} aria-label="Details">
			<i class="fa-sharp-duotone fa-solid fa-id-card"></i>
		</button>
	</div>
	<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
		<dt class="text-base-content/60">{m.birthDate()}</dt>
		<dd>{account.birthday?.toLocaleDateString(undefined, { timeZone: 'UTC' }) ?? '–'}</dd>
		<dt class="text-base-content/60">
			<i class="fa-sharp-duotone fa-solid fa-calendar-plus"></i>
		</dt>
		<dd>
			{m.possibleDuplicateAccountSince({ date: account.createdAt.toLocaleDateString() })}
		</dd>
	</dl>
	{#if attendances.length > 0}
		<ul class="flex flex-col gap-1 text-sm">
			{#each attendances as attendance (attendance.conferenceId + attendance.role)}
				<li class="flex items-center gap-2">
					<i class="fa-sharp-duotone fa-solid fa-flag text-base-content/60"></i>
					<span>{attendance.title}</span>
					<span class="badge badge-ghost badge-sm">{roleLabels[attendance.role]?.()}</span>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-base-content/60 text-sm">{m.possibleDuplicateNoAttendances()}</p>
	{/if}
	{#if account.globalNotes}
		<div class="alert alert-warning alert-soft text-sm">
			<i class="fa-sharp-duotone fa-solid fa-note-sticky"></i>
			<div>
				<p class="font-bold">{m.globalNotes()}</p>
				<p class="whitespace-pre-line">{account.globalNotes}</p>
			</div>
		</div>
	{/if}
</div>
