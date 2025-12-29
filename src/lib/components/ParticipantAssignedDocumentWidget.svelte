<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import hotkeys from 'hotkeys-js';
	import { onMount } from 'svelte';
	import toast from 'svelte-french-toast';

	interface Props {
		assignedDocumentNumber?: number;
		onSave: (number?: number) => Promise<void>;
		disabledShortcut?: boolean;
	}

	let { assignedDocumentNumber, onSave, disabledShortcut = false }: Props = $props();

	let editing = $state(false);
	let assignedDocumentNumberLocal = $state<number>();

	const onSaveFn = async (number?: number) => {
		await onSave(number);
		editing = false;
	};

	$effect(() => {
		if (!assignedDocumentNumber) {
			editing = true;
		} else {
			editing = false;
			assignedDocumentNumberLocal = assignedDocumentNumber;
		}
	});

	onMount(() => {
		if (!disabledShortcut) {
			hotkeys('n', () => {
				if (editing) {
					onSaveFn();
				}
			});
		}
	});
</script>

<div class="card bg-base-100 flex flex-col gap-2 p-4 shadow-md">
	<h3 class="font-bold">
		<i class="fa-duotone fa-hashtag mr-2"></i>
		{m.documentNumber()}
	</h3>
	{#if editing}
		<div class="join">
			<input
				class="input join-item w-full"
				bind:value={assignedDocumentNumberLocal}
				type="number"
			/>
			<button
				class="btn btn-error btn-square join-item"
				onclick={() => {
					editing = false;
				}}
				aria-label="Exit Editing"
			>
				<i class="fa-solid fa-xmark"></i>
			</button>

			<button
				class="btn btn-square join-item"
				onclick={() => {
					if (!assignedDocumentNumberLocal) {
						toast.error(m.documentNumberRequired());
						return;
					}
					onSaveFn(assignedDocumentNumberLocal);
				}}
				aria-label="Save"
			>
				<i class="fa-solid fa-save"></i>
			</button>
			<button
				class="btn join-item tooltip {disabledShortcut ? 'btn-square' : ''}"
				data-tip={m.saveNextDocumentNumber()}
				onclick={() => {
					onSaveFn();
				}}
				aria-label="SaveNext"
			>
				<i class="fa-solid fa-arrow-right-to-line"></i>
				{#if !disabledShortcut}
					<span class="kbd kbd-xs hidden sm:inline-block">n</span>
				{/if}
			</button>
		</div>
	{:else}
		<div class="flex justify-between gap-2 items-center">
			<div class="badge badge-xl badge-primary font-mono font-bold">
				# {assignedDocumentNumber}
			</div>
			<button class="btn btn-square" onclick={() => (editing = true)} aria-label="Edit">
				<i class="fa-solid fa-pen-to-square"></i>
			</button>
		</div>
	{/if}
</div>
