<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** The row itself opens the user card (`onRowClick`); these are the actions beside it. */
	interface Props {
		/** Only given to people who may impersonate */
		onImpersonate?: () => void;
		onDelete: () => void;
	}

	let { onImpersonate, onDelete }: Props = $props();
</script>

<div class="flex justify-end gap-2">
	{#if onImpersonate}
		<button
			class="btn btn-sm"
			title={m.impersonation()}
			onclick={(e) => {
				e.stopPropagation();
				onImpersonate();
			}}
		>
			<i aria-hidden="true" class="ph-duotone ph-detective"></i>
		</button>
	{/if}
	<button
		class="btn btn-sm btn-error"
		title={m.delete()}
		onclick={(e) => {
			e.stopPropagation();
			onDelete();
		}}
	>
		<i aria-hidden="true" class="ph-duotone ph-trash"></i>
	</button>
</div>
