<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/utils/toast';

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

<DashboardSection
	icon="user-check"
	title={m.ownPresence()}
	description={m.ownPresenceDescription()}
>
	<div class="card bg-base-100 dark:bg-base-200 max-w-80 p-6 shadow-md">
		<fieldset class="fieldset">
			<label class="label cursor-pointer">
				<span>{m.presentAtConference()}</span>
				<input
					type="checkbox"
					class="toggle toggle-success"
					checked={supervisor.plansOwnAttendenceAtConference}
					onchange={handlePresenceChange}
					disabled={!editable}
				/>
			</label>
		</fieldset>
	</div>
	<p class="text-xs text-gray-500">
		{#if supervisor.plansOwnAttendenceAtConference}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
			{@html m.willBePresentAtConference()}
		{:else}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
			{@html m.willNotBePresentAtConference()}
		{/if}
	</p>
</DashboardSection>
