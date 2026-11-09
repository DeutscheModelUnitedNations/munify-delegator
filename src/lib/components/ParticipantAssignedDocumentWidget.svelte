<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import hotkeys from 'hotkeys-js';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import Kbd from './Kbd.svelte';

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
			hotkeys('alt+n', () => {
				if (editing) {
					onSaveFn();
				}
			});
		}
	});

	onDestroy(() => {
		if (!disabledShortcut) {
			hotkeys.unbind('alt+n');
		}
	});
</script>

<div class="card flex min-w-0 flex-col gap-2 p-0 md:p-4">
	<h3 class="font-bold">
		<i aria-hidden="true" class="ph-duotone ph-hash mr-2"></i>
		{m.documentNumber()}
	</h3>
	{#if editing}
		<div class="join min-w-0">
			<input
				class="input join-item w-full min-w-0 flex-1"
				bind:value={assignedDocumentNumberLocal}
				type="number"
			/>
			<button
				class="btn btn-error btn-square join-item"
				onclick={() => {
					editing = false;
				}}
				aria-label={m.a11yExitEditing()}
			>
				<i aria-hidden="true" class="ph-duotone ph-x"></i>
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
				aria-label={m.save()}
			>
				<i aria-hidden="true" class="ph-duotone ph-floppy-disk"></i>
			</button>
			<button
				class="btn join-item tooltip {disabledShortcut ? 'btn-square' : ''}"
				data-tip={m.saveNextDocumentNumber()}
				onclick={() => {
					onSaveFn();
				}}
				aria-label={m.a11ySaveAndNext()}
			>
				<i aria-hidden="true" class="ph-duotone ph-arrow-line-right"></i>
				{#if !disabledShortcut}
					<span class="hidden sm:inline-block"><Kbd hotkey="alt+n" size="xs" /></span>
				{/if}
			</button>
		</div>
	{:else}
		<div class="flex justify-between gap-2 items-center">
			<div class="badge badge-xl badge-primary font-mono font-bold">
				# {assignedDocumentNumber}
			</div>
			<button class="btn btn-square" onclick={() => (editing = true)} aria-label={m.edit()}>
				<i aria-hidden="true" class="ph-duotone ph-note-pencil"></i>
			</button>
		</div>
	{/if}
</div>
