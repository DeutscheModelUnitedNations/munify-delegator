<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import toast from 'svelte-french-toast';

	interface Props {
		assignedDocumentNumber?: number;
		onSave: (number: number) => Promise<void>;
		nextDocumentNumber?: number | null;
	}

	let { assignedDocumentNumber = $bindable(), onSave, nextDocumentNumber }: Props = $props();
</script>

<div class="card bg-base-100 flex flex-col gap-2 p-4 shadow-md">
	<h3 class="font-bold">
		<i class="fa-duotone fa-hashtag mr-2"></i>
		{m.documentNumber()}
	</h3>
	<div class="join">
		<input class="input join-item" bind:value={assignedDocumentNumber} type="number" />
		<button
			class="btn btn-square join-item"
			onclick={() => {
				if (!assignedDocumentNumber) {
					toast.error(m.documentNumberRequired());
					return;
				}
				onSave(assignedDocumentNumber);
			}}
			aria-label="Save"
		>
			<i class="fa-solid fa-save"></i>
		</button>
		<button
			class="btn btn-square join-item tooltip"
			data-tip={m.saveNextDocumentNumber()}
			onclick={() => {
				if (!nextDocumentNumber) {
					toast.error(m.nextDocumentNumberNotAvailable());
					return;
				}
				onSave(nextDocumentNumber);
			}}
			aria-label="SaveNext"
		>
			<i class="fa-solid fa-arrow-right-to-line"></i>
		</button>
	</div>
	<div class="badge mt-2">
		{m.nextNumber()}: {nextDocumentNumber ?? '-'}
	</div>
</div>
