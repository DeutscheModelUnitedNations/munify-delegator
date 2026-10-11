<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		onOpenUserCard: () => void;
		/** Only given to people who may impersonate */
		onImpersonate?: () => void;
		onDelete: () => void;
	}

	let { onOpenUserCard, onImpersonate, onDelete }: Props = $props();
</script>

<div class="flex justify-end gap-2">
	<button
		class="btn btn-ghost btn-sm btn-square"
		title={m.adminUserCard()}
		onclick={(e) => {
			e.stopPropagation();
			onOpenUserCard();
		}}
	>
		<i class="fa-sharp-duotone fa-solid fa-id-card"></i>
	</button>
	{#if onImpersonate}
		<button
			class="btn btn-sm"
			title={m.impersonation()}
			onclick={(e) => {
				e.stopPropagation();
				onImpersonate();
			}}
		>
			<i class="fa-sharp-duotone fa-solid fa-user-secret"></i>
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
		<i class="fa-sharp-duotone fa-solid fa-trash"></i>
	</button>
</div>
