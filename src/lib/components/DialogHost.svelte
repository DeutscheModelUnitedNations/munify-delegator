<script lang="ts">
	import { modalFocus } from '#lib/helpers/modalFocus';
	import { dialogs } from '#lib/state/dialogs.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	const request = $derived(dialogs.current);
	let value = $state('');
	const textId = $props.id();

	$effect(() => {
		if (request?.kind === 'prompt') value = request.initialValue;
	});

	function accept() {
		// Read from the store, not from `request`: that derived is already `undefined` once
		// `current` is cleared, which would throw before the promise resolves.
		const open = dialogs.current;
		if (!open) return;
		dialogs.current = undefined;
		if (open.kind === 'confirm') open.resolve(true);
		else open.resolve(value);
	}

	function focus(node: HTMLElement, enabled: boolean = true) {
		if (enabled) node.focus();
	}
</script>

{#if request}
	<div class="modal modal-open" transition:fade={{ duration: 150 }}>
		<div
			class="modal-box"
			role="alertdialog"
			aria-modal="true"
			aria-describedby={textId}
			{@attach modalFocus(() => dialogs.dismiss())}
			transition:scale={{ start: 0.96, duration: 180, easing: cubicOut }}
		>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					accept();
				}}
			>
				{#if request.title}
					<h3 class="text-lg font-bold">{request.title}</h3>
				{/if}
				<p id={textId} class="py-4">{request.text}</p>
				{#if request.kind === 'prompt'}
					<input type="text" class="input w-full" bind:value use:focus />
				{/if}
				<div class="modal-action">
					<button type="button" class="btn" onclick={() => dialogs.dismiss()}>{m.cancel()}</button>
					<button
						type="submit"
						class="btn {request.kind === 'confirm' && request.danger ? 'btn-error' : 'btn-primary'}"
						use:focus={request.kind === 'confirm'}
					>
						{request.confirmLabel ??
							(request.kind === 'confirm' && request.danger ? m.delete() : m.confirm())}
					</button>
				</div>
			</form>
		</div>
		<button
			type="button"
			class="modal-backdrop"
			tabindex="-1"
			aria-label={m.close()}
			onclick={() => dialogs.dismiss()}
		></button>
	</div>
{/if}
