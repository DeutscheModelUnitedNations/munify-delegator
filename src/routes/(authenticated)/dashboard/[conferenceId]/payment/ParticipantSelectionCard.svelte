<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import type { PaymentParticipantSelection } from './participantSelection.svelte';

	/** Picking who a payment covers: select/deselect all, then the given fieldsets of people. */
	interface Props {
		selection: PaymentParticipantSelection;
		children: Snippet;
	}

	let { selection, children }: Props = $props();
</script>

<div class="bg-base-200 mt-4 flex w-full flex-col gap-2 rounded-box p-4 shadow-lg">
	<h2 class="text-2xl font-bold">
		<i class="fa-sharp-duotone fa-solid fa-list-check mr-4"></i>
		{m.selectParticipants()}
	</h2>

	<div class="join join-horizontal">
		<button
			class="btn btn-sm join-item"
			onclick={() => selection.selectAll()}
			disabled={selection.isReferenceCreated}
		>
			<i class="fa-sharp-duotone fa-solid fa-check-double"></i>
			{m.selectAll()}
		</button>
		<button
			class="btn btn-sm join-item"
			onclick={() => selection.clear()}
			disabled={selection.isReferenceCreated}
		>
			<i class="fa-sharp-duotone fa-solid fa-xmark"></i>
			{m.deselectAll()}
		</button>
	</div>

	{@render children()}

	<div class="alert alert-info mt-4">
		<i class="fa-sharp-duotone fa-solid fa-info-circle mr-2 text-2xl"></i>
		<div>
			<h3 class="font-bold">{m.participantsNotFoundTitle()}</h3>
			<p>
				{m.participantsNotFoundDescription()}
			</p>
		</div>
	</div>
</div>
