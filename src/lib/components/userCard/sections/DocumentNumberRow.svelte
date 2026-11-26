<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import EditableRow from './EditableRow.svelte';

	/** The number the person's postal documents are filed under, as a row of a `Section`. */
	interface Props {
		assignedDocumentNumber?: number;
		/** Without a number, the next free one is assigned. */
		onSave: (number?: number) => Promise<void>;
	}

	let { assignedDocumentNumber, onSave }: Props = $props();
</script>

{#snippet assignNext()}
	<button class="btn btn-sm btn-ghost text-primary" onclick={() => onSave()}>
		<i aria-hidden="true" class="ph-duotone ph-arrow-line-right"></i>
		{m.saveNextDocumentNumber()}
	</button>
{/snippet}

<EditableRow
	icon="hash"
	title={m.documentNumber()}
	value={assignedDocumentNumber?.toString()}
	empty={m.statusPending()}
	hint={m.documentNumberHint()}
	numeric
	onSave={(value) => onSave(Number(value))}
	actions={assignedDocumentNumber ? undefined : assignNext}
/>
