<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import Kbd from '$lib/components/Kbd.svelte';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import ScanStatusStrip from './ScanStatusStrip.svelte';
	import EditableIdentityField from './EditableIdentityField.svelte';
	import ParticipantRoleSummary from './ParticipantRoleSummary.svelte';
	import { identityUpdate } from './identityUpdate';
	import type { ScanIssue } from './scanCheck';
	import type { FoundPerson } from './scanLoad';

	interface Props {
		person: FoundPerson;
		/** Whether the name and birthday may be corrected here, which only participant care may. */
		canEdit: boolean;
		issues: ScanIssue[];
		/** What the scanner waits for: an access card number, or the open points to be read. */
		awaiting: 'badge' | 'ack' | null;
		badgeInput: string;
		busy: boolean;
		onConfirm: () => void;
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
		onClose,
		onChanged
	}: Props = $props();

	const issueMessages: Record<ScanIssue, () => string> = {
		notInConference: m.notInConference,
		paymentOpen: m.scanIssuePaymentOpen,
		termsOpen: m.scanIssueTermsOpen,
		guardianConsentOpen: m.scanIssueGuardianConsentOpen,
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
		<div class="flex flex-col gap-1 sm:flex-row sm:gap-3">
			<div class="flex-1">
				<EditableIdentityField
					initialValue={person.user.givenName ?? ''}
					fullWidth
					readonly={!canEdit}
					onSave={(value) => saveIdentityField('givenName', value)}
				>
					<span class="text-3xl font-bold">{person.user.givenName}</span>
				</EditableIdentityField>
			</div>
			<div class="flex-1">
				<EditableIdentityField
					initialValue={person.user.familyName ?? ''}
					fullWidth
					readonly={!canEdit}
					onSave={(value) => saveIdentityField('familyName', value)}
				>
					<span class="text-3xl font-bold">{person.user.familyName}</span>
				</EditableIdentityField>
			</div>
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
				<i class="fa-sharp-duotone fa-solid fa-cake-candles text-xl"></i>
				<span class="text-xl">
					{person.user.birthday
						? new Date(person.user.birthday).toLocaleDateString('de', { dateStyle: 'long' })
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
		<footer class="mb-0! flex flex-wrap gap-2 pt-2">
			<button class="btn flex-1 btn-primary" onclick={onConfirm} disabled={busy}>
				<i class="fa-sharp-duotone fa-solid fa-check"></i>
				{awaiting === 'badge' ? m.saveAndNext() : m.scanContinue()}
				<Kbd hotkey="alt+a" />
			</button>
			<!-- Open points are acknowledged with the main button; only a card still to be stored can be given up -->
			{#if awaiting === 'badge'}
				<button class="btn btn-error" onclick={onClose}>
					<i class="fa-sharp-duotone fa-solid fa-xmark"></i>
					{m.cancel()}
					<Kbd hotkey="Esc" />
				</button>
			{/if}
		</footer>
	{/if}
</section>
