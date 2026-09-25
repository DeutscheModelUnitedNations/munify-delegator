<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import ParticipantStatusWidget from '$lib/components/ParticipantStatusWidget.svelte';
	import ParticipantStatusWidgetBoolean from '$lib/components/BooleanStatusWidget.svelte';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/helpers/formatNames';
	import { toast } from 'svelte-sonner';
	import Section from './Section.svelte';

	let { data } = $props();

	const switchAttendanceState = async (value: boolean) => {
		loading = true;
		if (!confirm(m.switchAttendanceStateConfirmation())) {
			return;
		}
		try {
			await client.mutate.updateAllConferenceParticipantStatus({
				__args: { conferenceId: data.conferenceId, didAttend: value },
				changed: true
			});
			toast.success(m.changesSuccessful());
		} finally {
			loading = false;
		}
	};

	let loading = $state(false);
</script>

<div class="flex w-full flex-col flex-wrap gap-8 p-10">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{m.helper()}</h2>
		<p>{@html m.helperDescription()}</p>
	</div>
	<Section title={m.switchAttendanceState()} description={m.switchAttendanceStateDescription()}>
		<div class="join">
			<button class="btn join-item" onclick={() => switchAttendanceState(false)}>
				{#if loading}
					<i class="fa-duotone fa-spinner fa-spin"></i>
				{:else}
					<i class="fa-duotone fa-user-xmark"></i>
				{/if}
				{m.setAttendanceFalse()}
			</button>
			<button class="btn join-item" onclick={() => switchAttendanceState(true)}>
				{#if loading}
					<i class="fa-duotone fa-spinner fa-spin"></i>
				{:else}
					<i class="fa-duotone fa-user-check"></i>
				{/if}
				{m.setAttendanceTrue()}
			</button>
		</div>
	</Section>
</div>
