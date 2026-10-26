<script lang="ts" generics="T extends { id: string; name: string }">
	import Modal from '#lib/components/Modal.svelte';
	import { m } from '#lib/paraglide/messages.js';

	interface Props {
		role: T | undefined;
		confirmation: (role: T) => string;
		onconfirm: (id: string) => void;
	}

	let { role = $bindable(), confirmation, onconfirm }: Props = $props();
</script>

<Modal open={!!role} title={m.delete()} onclose={() => (role = undefined)}>
	{#if role}
		<p>{confirmation(role)}</p>
	{/if}
	{#snippet action()}
		<button class="btn" onclick={() => (role = undefined)}>{m.cancel()}</button>
		<button class="btn btn-error" onclick={() => role && onconfirm(role.id)}>
			<i class="fa-sharp-duotone fa-solid fa-trash"></i>
			{m.delete()}
		</button>
	{/snippet}
</Modal>
