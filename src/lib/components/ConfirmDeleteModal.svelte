<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import ActionModal from './ActionModal.svelte';

	/** Asks before deleting something; render it inside an `{#if}` while the question is open. */
	interface Props {
		title: string;
		text: string;
		onConfirm: () => Promise<void>;
		onClose: () => void;
	}

	let { title, text, onConfirm, onClose }: Props = $props();

	let isLoading = $state(false);

	async function confirm() {
		isLoading = true;
		try {
			await onConfirm();
		} finally {
			isLoading = false;
		}
	}
</script>

<ActionModal
	{title}
	bodyClass=""
	confirmLabel={m.delete()}
	confirmClass="btn-error"
	loading={isLoading}
	onConfirm={confirm}
	{onClose}
>
	<p class="py-4">{text}</p>
</ActionModal>
