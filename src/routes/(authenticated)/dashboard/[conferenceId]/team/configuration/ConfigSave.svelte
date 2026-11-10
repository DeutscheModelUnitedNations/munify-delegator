<!--
	@component
	The save button at the bottom of the settings and the e-mail page, and the "Confirm save" it
	opens with the preview of every pending change. Bind `open` to open it from elsewhere too.
	Confirming closes it and calls `onconfirm`, which does the saving.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import Modal from '#lib/components/Modal.svelte';
	import ConfigChangePreview from './ConfigChangePreview.svelte';
	import type { ConfigChange } from './changePreview';

	interface Props {
		open: boolean;
		changes: ConfigChange[];
		/** The button's text, with the number of changes */
		label: string;
		/** Whether the caller may save at all; nothing pending disables it anyway */
		mayEdit?: boolean;
		onconfirm: () => void;
	}

	let { open = $bindable(), changes, label, mayEdit = true, onconfirm }: Props = $props();

	function confirm() {
		open = false;
		onconfirm();
	}
</script>

<button
	type="button"
	onclick={() => (open = true)}
	class="btn btn-primary mt-6 w-full"
	disabled={!mayEdit || changes.length === 0}
>
	<i aria-hidden="true" class="ph-fill ph-floppy-disk mr-2"></i>
	{label}
</button>

<Modal bind:open title={m.confirmSave()}>
	<ConfigChangePreview {changes} />
	{#snippet action()}
		<button class="btn" onclick={() => (open = false)}>
			{m.cancel()}
		</button>
		<button class="btn btn-primary" disabled={changes.length === 0} onclick={confirm}>
			<i aria-hidden="true" class="ph-fill ph-floppy-disk mr-2"></i>
			{m.save()}
		</button>
	{/snippet}
</Modal>
