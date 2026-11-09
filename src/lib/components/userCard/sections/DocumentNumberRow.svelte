<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { toast } from 'svelte-sonner';

	/** The number on the person's postal documents, as a row of the user card's documents list. */
	interface Props {
		assignedDocumentNumber?: number;
		/** Without a number, the next free one is assigned. */
		onSave: (number?: number) => Promise<void>;
	}

	let { assignedDocumentNumber, onSave }: Props = $props();

	let editing = $state(false);
	let draft = $state<number>();

	const startEditing = () => {
		draft = assignedDocumentNumber;
		editing = true;
	};

	const save = async (number?: number) => {
		await onSave(number);
		editing = false;
	};

	const saveDraft = () => {
		if (!draft) {
			toast.error(m.documentNumberRequired());
			return;
		}
		save(draft);
	};
</script>

<div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
	<i class="ph-duotone ph-hash text-base-content/60 w-6 text-center text-lg"></i>
	<div class="flex min-w-48 grow flex-col">
		<span class="font-semibold">{m.documentNumber()}</span>
		{#if !editing}
			{#if assignedDocumentNumber}
				<span class="font-mono text-sm font-bold"># {assignedDocumentNumber}</span>
			{:else}
				<span class="text-warning text-sm">{m.statusPending()}</span>
			{/if}
		{/if}
	</div>
	{#if editing}
		<form
			class="join"
			onsubmit={(event) => {
				event.preventDefault();
				saveDraft();
			}}
		>
			<input
				class="input input-sm join-item w-28"
				type="number"
				min="1"
				bind:value={draft}
				aria-label={m.documentNumber()}
			/>
			<button class="btn btn-sm btn-square join-item" type="submit" aria-label={m.save()}>
				<i class="ph-duotone ph-floppy-disk"></i>
			</button>
			<button
				class="btn btn-sm btn-square join-item"
				type="button"
				onclick={() => (editing = false)}
				aria-label={m.a11yExitEditing()}
			>
				<i class="ph-duotone ph-x"></i>
			</button>
		</form>
	{:else}
		<div class="join">
			{#if !assignedDocumentNumber}
				<button
					class="btn btn-sm join-item"
					onclick={() => save()}
					aria-label={m.a11ySaveAndNext()}
				>
					<i class="ph-duotone ph-arrow-line-right"></i>
					{m.saveNextDocumentNumber()}
				</button>
			{/if}
			<button
				class="btn btn-sm btn-square join-item"
				onclick={startEditing}
				aria-label={m.edit()}
				title={m.edit()}
			>
				<i class="ph-duotone ph-note-pencil"></i>
			</button>
		</div>
	{/if}
</div>
