<script lang="ts">
	import { page } from '$app/state';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import DelegationStatusTableWrapper from '#lib/components/delegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '#lib/components/delegationStatusTable/Entry.svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import formatNames from '#lib/helpers/formatNames';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import { ENTRY_CODE_LENGTH } from '#lib/helpers/entryCode';
	import { createEntryCodeInput } from '#lib/helpers/entryCodeInput.svelte.js';
	import { linkedSupervisorCode, SUPERVISOR_SECTION_ID } from '#lib/helpers/supervisorLink';
	import { onMount } from 'svelte';

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

	// A supervisor's shared link lands here with `?supervisorCode=`; it only seeds the field, the
	// participant still confirms with the button.
	const linkedCode = linkedSupervisorCode(page.url);
	const code = createEntryCodeInput(linkedCode);
	// Points the participant at this section until they connected.
	let arrivedByLink = $state(linkedCode !== '');

	onMount(() => {
		if (!arrivedByLink) return;
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		document
			.getElementById(SUPERVISOR_SECTION_ID)
			?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
	});
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
			arrivedByLink = false;
		} finally {
			connecting = false;
		}
	};
</script>

{#snippet previewCard(preview: SupervisorPreview)}
	<div class="flex flex-col gap-2 rounded-box bg-base-200 p-3">
		<div class="flex flex-wrap items-center gap-3">
			<div
				class="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-content"
				aria-hidden="true"
			>
				{`${preview.given_name?.at(0) ?? ''}${preview.family_name?.at(0) ?? ''}`.toUpperCase()}
			</div>
			<div class="flex min-w-0 flex-1 flex-col">
				<span class="font-semibold">
					{formatNames({
						givenName: preview.given_name ?? '',
						familyName: preview.family_name ?? ''
					})}
				</span>
				{#if preview.school_name}
					<span class="truncate text-sm text-base-content/70">
						{preview.school_name}{preview.school_city ? `, ${preview.school_city}` : ''}
					</span>
				{/if}
			</div>
			<button class="btn btn-primary btn-sm" type="submit" disabled={connecting}>
				{#if connecting}
					<span class="loading loading-spinner loading-xs"></span>
				{:else}
					<i aria-hidden="true" class="ph-duotone ph-link"></i>
				{/if}
				{m.connectSupervisorBtn()}
			</button>
		</div>
		{#if preview.different_school}
			<p class="flex gap-2 text-sm text-warning">
				<i aria-hidden="true" class="ph-duotone ph-warning mt-0.5"></i>
				<span>{m.connectSupervisorDifferentSchool()}</span>
			</p>
		{/if}
		<p class="text-xs text-base-content/60">{m.connectSupervisorWarning()}</p>
	</div>
{/snippet}

<DashboardSection
	id={SUPERVISOR_SECTION_ID}
	icon="chalkboard-teacher"
	title={m.supervisors()}
	description={m.supervisorsDescription()}
	class={arrivedByLink ? 'ring-4 ring-primary ring-offset-2 ring-offset-base-100' : ''}
>
	{#if supervisors.length > 0}
		<DelegationStatusTableWrapper withEmail>
			{#each supervisors as supervisor (supervisor.id)}
				<DelegationStatusTableEntry
					name={formatNames({
						givenName: supervisor.user.givenName,
						familyName: supervisor.user.familyName
					})}
					pronouns={supervisor.user.pronouns}
					email={supervisor.user.email}
				/>
			{/each}
		</DelegationStatusTableWrapper>
	{/if}

	<form class="flex flex-col gap-2 {supervisors.length > 0 ? 'mt-4' : ''}" onsubmit={connect}>
		<label class="text-sm font-semibold" for="supervisor-code">{m.connectSupervisor()}</label>
		{#if arrivedByLink}
			<p class="flex gap-2 text-sm text-primary">
				<i aria-hidden="true" class="ph-duotone ph-hand-pointing mt-0.5"></i>
				<span>{m.supervisorLinkPrefilled()}</span>
			</p>
		{:else}
			<p class="text-sm text-base-content/70">{m.connectSupervisorDescription()}</p>
		{/if}
		<div class="flex flex-col gap-3 md:flex-row md:items-start">
			<div class="flex shrink-0 flex-col gap-1">
				<input
					id="supervisor-code"
					type="text"
					class="input w-full font-mono tracking-[0.4rem] uppercase md:w-52"
					maxlength={ENTRY_CODE_LENGTH}
					autocomplete="off"
					aria-describedby={readyCode && !preview ? 'supervisor-code-error' : undefined}
					bind:value={code.value}
				/>
				{#if readyCode && !preview}
					<p id="supervisor-code-error" class="text-sm text-error">{m.notFound()}</p>
				{/if}
			</div>
			{#if readyCode && preview}
				<div class="min-w-0 flex-1 md:max-w-2xl">{@render previewCard(preview)}</div>
			{/if}
		</div>
	</form>
</DashboardSection>
