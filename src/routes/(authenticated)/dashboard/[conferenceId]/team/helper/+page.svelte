<script lang="ts">
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import Section from './Section.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const switchAttendanceState = async (value: boolean) => {
		if (!(await confirmDialog({ text: m.switchAttendanceStateConfirmation() }))) return;
		loading = true;
		try {
			await client.mutate.updateAllConferenceParticipants({
				__args: { conferenceId: params.conferenceId, didAttend: value },
				changed: true
			});
			toast.success(m.changesSuccessful());
		} finally {
			loading = false;
		}
	};

	let loading = $state(false);
</script>

<div class="flex w-full flex-col flex-wrap gap-8 py-4 sm:p-10">
	<div class="flex flex-col gap-2">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
		<p>{@html m.helperDescription()}</p>
	</div>
	<Section title={m.switchAttendanceState()} description={m.switchAttendanceStateDescription()}>
		<div class="join max-sm:join-vertical max-sm:w-full">
			<button class="btn join-item" onclick={() => switchAttendanceState(false)}>
				{#if loading}
					<i aria-hidden="true" class="ph-duotone ph-spinner-gap animate-spin"></i>
				{:else}
					<i aria-hidden="true" class="ph-duotone ph-user-minus"></i>
				{/if}
				{m.setAttendanceFalse()}
			</button>
			<button class="btn join-item" onclick={() => switchAttendanceState(true)}>
				{#if loading}
					<i aria-hidden="true" class="ph-duotone ph-spinner-gap animate-spin"></i>
				{:else}
					<i aria-hidden="true" class="ph-duotone ph-user-check"></i>
				{/if}
				{m.setAttendanceTrue()}
			</button>
		</div>
	</Section>
</div>
