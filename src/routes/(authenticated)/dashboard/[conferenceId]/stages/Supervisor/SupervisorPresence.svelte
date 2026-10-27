<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import InfoRow from '#lib/components/userCard/sections/InfoRow.svelte';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';

	interface Props {
		supervisorId: string;
		/** Attendance can only be changed while registration is open. */
		editable: boolean;
	}

	let { supervisorId, editable }: Props = $props();

	const supervisor = $derived(
		await client.liveQuery.conferenceSupervisor({
			__args: { id: supervisorId },
			plansOwnAttendenceAtConference: true
		})
	);

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
	faIcon="user-check"
	hint={editable ? m.ownPresenceDescription() : m.presenceLockedHint()}
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
				class="fa-sharp-duotone fa-solid fa-lock text-base-content/40"
				title={m.presenceLockedHint()}
			></i>
		{/if}
		<input
			type="checkbox"
			class="toggle toggle-success"
			aria-label={m.presentAtConference()}
			checked={supervisor.plansOwnAttendenceAtConference}
			onchange={handlePresenceChange}
			disabled={!editable}
		/>
	{/snippet}
</InfoRow>
