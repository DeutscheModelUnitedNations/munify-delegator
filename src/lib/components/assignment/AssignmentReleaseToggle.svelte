<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';

	/**
	 * Shows participants their assigned roles, or hides them again. Saves on its own, outside any
	 * surrounding form: project management and participant care may both flip it.
	 */
	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: conferenceId },
			assignmentReleased: true,
			assignmentReleasedAt: true
		})
	);
	let saving = $state(false);

	async function setReleased(released: boolean) {
		saving = true;
		const promise = Promise.resolve(
			client.mutate.setAssignmentReleased({ __args: { conferenceId, released } })
		);
		toast.promise(promise, genericPromiseToastMessages);
		try {
			await promise;
		} finally {
			saving = false;
		}
	}
</script>

<label class="flex cursor-pointer items-start gap-3">
	<input
		type="checkbox"
		class="toggle toggle-success mt-0.5"
		checked={conference.assignmentReleased}
		disabled={saving}
		onchange={(e) => setReleased(e.currentTarget.checked)}
	/>
	<span class="flex flex-col gap-1">
		<span class="font-medium">{m.assignmentReleaseToggle()}</span>
		<span class="text-sm opacity-70">
			{#if conference.assignmentReleased && conference.assignmentReleasedAt}
				{m.assignmentReleasedSince({
					date: new Date(conference.assignmentReleasedAt).toLocaleString()
				})}
			{:else}
				{m.assignmentReleaseToggleDescription()}
			{/if}
		</span>
	</span>
</label>
