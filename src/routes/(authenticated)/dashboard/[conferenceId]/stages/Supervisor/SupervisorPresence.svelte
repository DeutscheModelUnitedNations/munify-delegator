<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import InfoRow from '#lib/components/userCard/sections/InfoRow.svelte';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import ApplicationBlockers from '#lib/components/registration/ApplicationBlockers.svelte';

	interface Props {
		supervisorId: string;
		/** Attendance can only be changed while registration is open. */
		editable: boolean;
	}

	let { supervisorId, editable }: Props = $props();

	const supervisor = $derived(
		await client.liveQuery.conferenceSupervisor({
			__args: { id: supervisorId },
			plansOwnAttendenceAtConference: true,
			applicationBlockers: {
				userId: true,
				ageIssue: true,
				invalidFields: true,
				user: { givenName: true, familyName: true }
			}
		})
	);
	const blockers = $derived(supervisor.applicationBlockers);
	// Attending in person is the supervisor's application: confirming it waits for the findings.
	const blocked = $derived(!supervisor.plansOwnAttendenceAtConference && blockers.length > 0);

	const handlePresenceChange = async (e: Event & { currentTarget: HTMLInputElement }) => {
		const promise = client.mutate.updateConferenceSupervisor({
			__args: { id: supervisorId, plansOwnAttendenceAtConference: e.currentTarget.checked },
			id: true,
			plansOwnAttendenceAtConference: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};
</script>

<InfoRow
	title={m.ownPresence()}
	icon="user-check"
	hint={editable
		? blocked
			? m.supervisorAttendanceBlockedHint()
			: m.ownPresenceDescription()
		: m.presenceLockedHint()}
>
	<span class="text-sm">
		{#if supervisor.plansOwnAttendenceAtConference}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
			{@html m.willBePresentAtConference()}
		{:else}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
			{@html m.willNotBePresentAtConference()}
		{/if}
	</span>
	{#snippet actions()}
		{#if !editable}
			<i
				aria-hidden="true"
				class="ph-duotone ph-lock text-base-content/40"
				title={m.presenceLockedHint()}
			></i>
		{/if}
		<input
			type="checkbox"
			class="toggle toggle-success"
			aria-label={m.presentAtConference()}
			checked={supervisor.plansOwnAttendenceAtConference}
			onchange={handlePresenceChange}
			disabled={!editable || blocked}
		/>
	{/snippet}
</InfoRow>
{#if editable && blocked}
	<div class="p-3">
		<ApplicationBlockers
			{blockers}
			title={m.supervisorAttendanceBlockersTitle()}
			description={m.supervisorAttendanceBlockersDescription()}
		/>
	</div>
{/if}
