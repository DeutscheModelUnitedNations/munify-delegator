<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';
	import ScanStatusStrip from './ScanStatusStrip.svelte';
	import EditableIdentityField from './EditableIdentityField.svelte';
	import ParticipantRoleSummary from './ParticipantRoleSummary.svelte';
	import { identityUpdate } from './identityUpdate';
	import type { ScanIssue } from './scanCheck';
	import ScanResultActions from './ScanResultActions.svelte';
	import type { FoundPerson } from './scanLoad';
	import type { ShownPerson } from './attendanceSession';

	interface Props {
		person: FoundPerson;
		/** Whether the name and birthday may be corrected here, which only participant care may. */
		canEdit: boolean;
		issues: ScanIssue[];
		/** What the scanner waits for: an access card number, or the open points to be read. */
		awaiting: ShownPerson['awaiting'];
		badgeInput: string;
		busy: boolean;
		onConfirm: () => void;
		/** Records the person despite the open points (check mode). */
		onRecordAnyway: () => void;
		onClose: () => void;
		/** The person's data changed here and has to be loaded again. */
		onChanged: () => Promise<void>;
	}

	let {
		person,
		canEdit,
		issues,
		awaiting,
		badgeInput = $bindable(),
		busy,
		onConfirm,
		onRecordAnyway,
		onClose,
		onChanged
	}: Props = $props();

	const issueMessages: Record<ScanIssue, () => string> = {
		teamMember: m.scanTeamMemberNotRecorded,
		notInConference: m.notInConference,
		paymentOpen: m.scanIssuePaymentOpen,
		termsOpen: m.scanIssueTermsOpen,
		guardianConsentOpen: m.scanIssueGuardianConsentOpen,
		surveyOptionMissing: () =>
			m.scanIssueSurveyOptionMissing({
				options: new Intl.ListFormat(getLocale(), { type: 'disjunction' }).format(
					person.missingSurveyOptions
				)
			}),
		alreadyScanned: m.duplicateScan
	};

	let badgeInputElem = $state<HTMLInputElement>();

	// The card number is the next thing to type once the person is shown
	$effect(() => {
		if (awaiting === 'badge' && badgeInputElem) badgeInputElem.focus();
	});

	async function saveIdentityField(field: 'givenName' | 'familyName' | 'birthday', value: string) {
		const promise = client.mutate.updateUsersIdentityInfo({
			__args: { id: person.user.id, ...identityUpdate(field, value) },
			id: true,
			givenName: true,
			familyName: true,
			birthday: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		await onChanged();
	}
</script>

<section
	class="flow-root min-w-0 rounded-box bg-base-200/60 p-2 md:p-6 [&>:not(header)]:mb-2 md:[&>:not(header)]:mb-4"
	aria-label={m.identityCheck()}
>
	<header class="float-right mb-2 ml-3 flex gap-2">
		<button
			class="btn btn-soft btn-sm"
			onclick={() => openUserCard(person.user.id)}
			aria-label={m.details()}
		>
			<i class="fa-sharp-duotone fa-solid fa-id-card"></i>
		</button>
	</header>

	<ParticipantRoleSummary roles={person.roles}>
		<!-- Given and family name read as one line; each is tapped on its own to correct it -->
		<div class="flex flex-wrap items-center gap-x-3">
			<EditableIdentityField
				initialValue={person.user.givenName ?? ''}
				readonly={!canEdit}
				onSave={(value) => saveIdentityField('givenName', value)}
			>
				<span class="text-2xl font-bold md:text-3xl">{person.user.givenName}</span>
			</EditableIdentityField>
			<EditableIdentityField
				initialValue={person.user.familyName ?? ''}
				readonly={!canEdit}
				onSave={(value) => saveIdentityField('familyName', value)}
			>
				<span class="text-2xl font-bold md:text-3xl">{person.user.familyName}</span>
			</EditableIdentityField>
		</div>

		<div>
			<EditableIdentityField
				type="date"
				readonly={!canEdit}
				initialValue={person.user.birthday
					? new Date(person.user.birthday).toISOString().split('T')[0]
					: ''}
				onSave={(value) => saveIdentityField('birthday', value)}
			>
				<i class="fa-sharp-duotone fa-solid fa-cake-candles md:text-xl"></i>
				<span class="md:text-xl">
					{person.user.birthday
						? new Date(person.user.birthday).toLocaleDateString(getLocale(), { dateStyle: 'long' })
						: '—'}
				</span>
			</EditableIdentityField>
		</div>
	</ParticipantRoleSummary>

	<ScanStatusStrip status={person.status} />

	{#if issues.length === 0}
		<div class="alert alert-success alert-soft" role="status">
			<i class="fa-sharp-duotone fa-solid fa-circle-check"></i>
			<span>{m.scanAllClear()}</span>
		</div>
	{:else}
		<div class="alert alert-warning alert-soft items-start" role="alert">
			<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation mt-1"></i>
			<div class="flex flex-col gap-1">
				<span class="font-semibold">{m.scanIssuesFound()}</span>
				<ul class="list-inside list-disc">
					{#each issues as issue (issue)}
						<li>{issueMessages[issue]()}</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}

	{#if awaiting === 'badge'}
		<label class="input input-lg w-full">
			<span class="label">{m.accessCardId()}</span>
			<input
				bind:this={badgeInputElem}
				bind:value={badgeInput}
				type="text"
				onkeydown={(e) => {
					if (e.key === 'Enter') onConfirm();
				}}
			/>
		</label>
		<p class="text-sm text-base-content/60">{m.scanWaitsForBadge()}</p>
	{/if}

	{#if awaiting}
		<ScanResultActions {awaiting} {issues} {busy} {onConfirm} {onRecordAnyway} {onClose} />
	{/if}
</section>
