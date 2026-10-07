<script lang="ts">
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		paperId: string;
		conferenceId: string;
		/** What the user has to type to confirm, e.g. "GA: Climate change - Germany". */
		confirmationText: string;
	}

	let { paperId, conferenceId, confirmationText }: Props = $props();

	let showDangerZone = $state(false);
	let deleteConfirmationText = $state('');

	const handleDeletePaper = async () => {
		if (deleteConfirmationText !== confirmationText) {
			toast.error(m.paperDeleteConfirmationMismatch());
			return;
		}

		const promise = Promise.resolve(client.mutate.deletePaper({ __args: { id: paperId } }));
		toast.promise(promise, {
			loading: m.paperDeleting(),
			success: m.paperDeletedSuccessfully(),
			error: (err) => (err instanceof Error ? err.message : null) || m.paperDeleteError()
		});
		await promise;

		goto(resolve(`/dashboard/${conferenceId}/paperhub`));
	};
</script>

<div class="mt-8">
	<button
		class="btn btn-ghost btn-sm text-base-content/40 hover:text-error"
		onclick={() => (showDangerZone = !showDangerZone)}
	>
		<i class="fa-solid {showDangerZone ? 'fa-chevron-down' : 'fa-chevron-right'}"></i>
		{m.dangerZone()}
	</button>

	{#if showDangerZone}
		<div class="mt-2 border border-error/30 rounded-box p-4 bg-error/5">
			<div class="flex items-center gap-2 text-error mb-3">
				<i class="fa-solid fa-triangle-exclamation text-lg"></i>
				<h3 class="font-bold">{m.paperDeleteTitle()}</h3>
			</div>

			<p class="text-sm text-base-content/70 mb-4">
				{m.paperDeleteWarning()}
			</p>

			<div class="form-control mb-4">
				<label class="label" for="delete-confirmation">
					<span class="label-text text-sm">{m.paperDeleteConfirmation()}</span>
				</label>
				<div class="text-xs text-base-content/50 mb-2 font-mono bg-base-200 p-2 rounded-box">
					{confirmationText}
				</div>
				<input
					id="delete-confirmation"
					type="text"
					class="input input-bordered input-error w-full"
					placeholder={confirmationText}
					bind:value={deleteConfirmationText}
				/>
			</div>

			<button
				class="btn btn-error"
				disabled={deleteConfirmationText !== confirmationText}
				onclick={handleDeletePaper}
			>
				<i class="fa-solid fa-trash"></i>
				{m.paperDeleteButton()}
			</button>
		</div>
	{/if}
</div>
