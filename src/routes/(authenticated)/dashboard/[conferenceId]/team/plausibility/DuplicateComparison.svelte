<script lang="ts">
	import formatNames from '$lib/helpers/formatNames';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';

	interface Account {
		givenName: string;
		familyName: string;
		birthday: Date | null;
		email: string;
		createdAt: Date;
		globalNotes: string | null;
		/** Null where the reader may not see it, or there is none. */
		phone: string | null;
		emergencyContacts: string | null;
		street: string | null;
		zip: string | null;
		city: string | null;
	}

	interface Side {
		id: string;
		account: Account;
		attendances: { conferenceId: string; title: string; startConference: Date; role: string }[];
	}

	/**
	 * Two accounts side by side, one row per thing the matcher compares. A row the matcher found
	 * alike (`reasons`) is marked, so what makes the pair stand out is visible at a glance.
	 */
	interface Props {
		reasons: string[];
		left: Side;
		right: Side;
		/** Fills the corner above the row labels, which would stay empty otherwise. */
		corner?: Snippet;
	}

	let { reasons, left, right, corner }: Props = $props();

	const roleLabels: Record<string, () => string> = {
		DELEGATION_MEMBER: m.delegationMember,
		SINGLE_PARTICIPANT: m.singleParticipant,
		SUPERVISOR: m.supervisor
	};

	const day = (date: Date | null) => date?.toLocaleDateString(undefined, { timeZone: 'UTC' }) ?? '';
	const address = (a: Account) =>
		[a.street, [a.zip, a.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');

	/** Rows that compare one value, each tied to the reason the matcher gives for it. */
	const rows = $derived([
		{
			label: m.duplicateReasonName(),
			icon: 'id-card',
			reason: 'name',
			value: (a: Account) => formatNames(a.givenName, a.familyName)
		},
		{
			label: m.duplicateReasonBirthday(),
			icon: 'birthday-cake',
			reason: 'birthday',
			value: (a: Account) => day(a.birthday)
		},
		{
			label: m.duplicateReasonEmail(),
			icon: 'envelope',
			reason: 'email',
			value: (a: Account) => a.email
		},
		{
			label: m.duplicateReasonPhone(),
			icon: 'phone',
			reason: 'phone',
			value: (a: Account) => a.phone ?? ''
		},
		{
			label: m.duplicateReasonEmergencyContact(),
			icon: 'light-emergency-on',
			reason: 'emergencyContact',
			value: (a: Account) => a.emergencyContacts ?? ''
		},
		{ label: m.duplicateReasonAddress(), icon: 'house', reason: 'address', value: address },
		{
			label: m.duplicateRowAccountSince(),
			icon: 'calendar-plus',
			reason: undefined,
			value: (a: Account) => a.createdAt.toLocaleDateString()
		}
	]);
</script>

{#snippet header(side: Side)}
	{@const note = side.account.globalNotes?.trim()}
	<th class="align-top font-normal">
		<div class="flex items-start justify-between gap-2">
			<span class="text-base font-bold">
				{formatNames(side.account.givenName, side.account.familyName)}
			</span>
			<div class="flex items-center gap-1">
				<!-- Always there, hidden without a note, so the buttons do not move between the accounts -->
				<i
					class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-error text-lg {note
						? ''
						: 'invisible'}"
					title={note}
					aria-label={note ? m.globalNotes() : undefined}
					aria-hidden={note ? undefined : true}
				></i>
				<button
					class="btn btn-xs btn-ghost btn-square"
					onclick={() => openUserCard(side.id)}
					aria-label="Details"
				>
					<i class="fa-sharp-duotone fa-solid fa-id-card"></i>
				</button>
			</div>
		</div>
		<div class="mt-1 flex flex-col gap-1 text-xs">
			{#each side.attendances as attendance (attendance.conferenceId + attendance.role)}
				<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
					<i class="fa-sharp-duotone fa-solid fa-flag text-base-content/60"></i>
					<span>{attendance.title}</span>
					<span class="badge badge-sm bg-base-100 border-0">
						{roleLabels[attendance.role]?.()}
					</span>
				</div>
			{:else}
				<span class="text-base-content/60">{m.possibleDuplicateNoAttendances()}</span>
			{/each}
		</div>
	</th>
{/snippet}

<table class="table table-fixed">
	<thead>
		<tr>
			<th class="w-16 align-top">{@render corner?.()}</th>
			{@render header(left)}
			{@render header(right)}
		</tr>
	</thead>
	<tbody>
		{#each rows as row (row.label)}
			{@const alike = row.reason !== undefined && reasons.includes(row.reason)}
			<tr class={alike ? 'bg-warning/20' : ''}>
				<th class="text-center">
					<i
						class="fa-sharp-duotone fa-solid fa-{row.icon} {alike
							? 'text-warning'
							: 'text-base-content/60'}"
						title={row.label}
						role="img"
						aria-label={row.label}
					></i>
				</th>
				<td class="text-sm wrap-anywhere">{row.value(left.account) || '–'}</td>
				<td class="text-sm wrap-anywhere">{row.value(right.account) || '–'}</td>
			</tr>
		{/each}
	</tbody>
</table>
