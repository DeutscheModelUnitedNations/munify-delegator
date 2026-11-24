<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import hotkeys from 'hotkeys-js';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import Kbd from './Kbd.svelte';

	interface Props {
		assignedDocumentNumber?: number;
		/** Without a number, the next free one is assigned. */
		onSave: (number?: number) => Promise<void>;
		disabledShortcut?: boolean;
	}

	let { assignedDocumentNumber, onSave, disabledShortcut = false }: Props = $props();

	let editing = $state(false);
	let assignedDocumentNumberLocal = $state<number>();

	/** A number is on the person's papers already: only a typed one replaces it. */
	const mayAssignNext = $derived(editing && !assignedDocumentNumber);

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
				if (mayAssignNext) {
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
	<p class="text-base-content/70 text-sm">{m.documentNumberHint()}</p>
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
			{#if mayAssignNext}
				<button
					class="btn join-item tooltip {disabledShortcut ? 'btn-square' : ''}"
					data-tip={m.saveNextDocumentNumber()}
					onclick={() => {
						onSaveFn();
					}}
					aria-label={m.saveNextDocumentNumber()}
				>
					<i aria-hidden="true" class="ph-duotone ph-arrow-line-right"></i>
					{#if !disabledShortcut}
						<span class="hidden sm:inline-block"><Kbd hotkey="alt+n" size="xs" /></span>
					{/if}
				</button>
			{/if}
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
