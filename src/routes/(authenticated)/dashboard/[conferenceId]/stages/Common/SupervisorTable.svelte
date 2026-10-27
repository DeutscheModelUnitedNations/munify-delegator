<script lang="ts">
	import { page } from '$app/state';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import DelegationStatusTableWrapper from '#lib/components/delegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '#lib/components/delegationStatusTable/Entry.svelte';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import formatNames from '#lib/helpers/formatNames.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import { toast } from 'svelte-sonner';
	import { ENTRY_CODE_LENGTH } from '#lib/helpers/entryCode.js';
	import { createEntryCodeInput } from '#lib/helpers/entryCodeInput.svelte.js';

	/** The supervisors of one registration: a delegation membership or a single participant. */
	type Props = { conferenceId: string } & (
		| { delegationMemberId: string; singleParticipantId?: never }
		| { singleParticipantId: string; delegationMemberId?: never }
	);

	let { conferenceId, delegationMemberId, singleParticipantId }: Props = $props();

	const supervisorSelection = {
		id: true,
		user: { givenName: true, familyName: true, pronouns: true, email: true }
	} as const;

	// The record and its supervisors in two steps: reading a field of a live result inside the
	// `$derived` that queried it would make every live update issue the query again.
	const registration = $derived(
		delegationMemberId
			? await client.liveQuery.delegationMember({
					__args: { id: delegationMemberId },
					supervisors: supervisorSelection
				})
			: singleParticipantId
				? await client.liveQuery.singleParticipant({
						__args: { id: singleParticipantId },
						supervisors: supervisorSelection
					})
				: undefined
	);
	const supervisors = $derived(registration?.supervisors ?? []);

	// A supervisor's shared link lands here with `?supervisorCode=`; it only seeds the field.
	const code = createEntryCodeInput(page.url.searchParams.get('supervisorCode') ?? '');
	// The code to look up, as a primitive the awaited derived below is keyed by.
	const readyCode = $derived(code.ready);

	function fetchPreview(connectionCode: string) {
		return client.query
			.previewConferenceSupervisor({
				__args: { conferenceId, connectionCode },
				family_name: true,
				given_name: true,
				school_name: true,
				school_city: true,
				different_school: true
			})
			.catch(() => undefined);
	}

	type SupervisorPreview = NonNullable<Awaited<ReturnType<typeof fetchPreview>>>;

	// Who the code belongs to, shown before connecting: connecting can only be undone by the care team.
	const preview = $derived(readyCode ? await fetchPreview(readyCode) : undefined);

	let connecting = $state(false);

	const connect = async (event: SubmitEvent) => {
		event.preventDefault();
		if (!readyCode || !preview || connecting) return;
		connecting = true;
		try {
			const promise = client.mutate.connectToConferenceSupervisor({
				__args: { conferenceId, connectionCode: readyCode },
				id: true
			});
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
			code.value = '';
		} finally {
			connecting = false;
		}
	};
</script>

{#snippet previewCard(preview: SupervisorPreview)}
	<div class="rounded-box border border-base-300 bg-base-200 p-4">
		<div class="flex items-center gap-4">
			<div
				class="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-primary-content"
			>
				{`${preview.given_name?.at(0) ?? ''}${preview.family_name?.at(0) ?? ''}`.toUpperCase()}
			</div>
			<div class="flex min-w-0 flex-col">
				<span class="text-lg font-bold">
					{formatNames(preview.given_name ?? '', preview.family_name ?? '')}
				</span>
				{#if preview.school_name}
					<span class="flex items-center gap-2 text-sm text-base-content/70">
						<i class="fa-sharp-duotone fa-solid fa-school"></i>
						<span class="truncate">
							{preview.school_name}{preview.school_city ? `, ${preview.school_city}` : ''}
						</span>
					</span>
				{/if}
			</div>
		</div>
		{#if preview.different_school}
			<div class="alert alert-warning alert-soft mt-4 text-sm">
				<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation"></i>
				<span>{m.connectSupervisorDifferentSchool()}</span>
			</div>
		{/if}
		<p class="mt-4 flex gap-2 border-t border-base-300 pt-3 text-sm text-base-content/70">
			<i class="fa-sharp-duotone fa-solid fa-circle-info mt-0.5 text-info"></i>
			<span>{m.connectSupervisorWarning()}</span>
		</p>
	</div>
{/snippet}

<DashboardSection
	icon="chalkboard-user"
	title={m.supervisors()}
	description={m.supervisorsDescription()}
>
	{#if supervisors.length > 0}
		<DelegationStatusTableWrapper withEmail>
			{#each supervisors as supervisor (supervisor.id)}
				<DelegationStatusTableEntry
					name={formatNames(supervisor.user.givenName, supervisor.user.familyName)}
					pronouns={supervisor.user.pronouns}
					email={supervisor.user.email}
				/>
			{/each}
		</DelegationStatusTableWrapper>
	{/if}

	<form class="mt-4 flex w-full max-w-lg flex-col gap-2" onsubmit={connect}>
		<label class="text-sm font-bold" for="supervisor-code">{m.connectSupervisor()}</label>
		<p class="text-sm">{m.connectSupervisorDescription()}</p>
		<div class="join w-full">
			<input
				id="supervisor-code"
				type="text"
				class="input join-item w-full font-mono tracking-[0.4rem] uppercase"
				maxlength={ENTRY_CODE_LENGTH}
				autocomplete="off"
				bind:value={code.value}
			/>
			<button class="btn btn-primary join-item" type="submit" disabled={!preview || connecting}>
				{#if connecting}
					<span class="loading loading-spinner loading-sm"></span>
				{:else}
					<i class="fa-sharp-duotone fa-solid fa-link"></i>
				{/if}
				{m.connectSupervisorBtn()}
			</button>
		</div>
		{#if readyCode}
			{#if preview}
				{@render previewCard(preview)}
			{:else}
				<div class="alert alert-warning">{m.notFound()}</div>
			{/if}
		{/if}
	</form>
</DashboardSection>
