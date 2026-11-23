<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** The row itself opens the user card (`onRowClick`); these are the actions beside it. */
	interface Props {
		/** Opens the member's committee functions (chair, consultant) */
		onFunctions: () => void;
		/** Only given to people who may impersonate */
		onImpersonate?: () => void;
		onDelete: () => void;
	}

	let { onFunctions, onImpersonate, onDelete }: Props = $props();
</script>

<div class="flex justify-end gap-2" data-tour="team.members.actions">
	<button
		class="btn btn-ghost btn-sm btn-square"
		title={m.teamMemberEditFunctions()}
		aria-label={m.teamMemberEditFunctions()}
		data-testid="team-functions-open"
		onclick={(e) => {
			e.stopPropagation();
			onFunctions();
		}}
	>
		<i aria-hidden="true" class="ph-duotone ph-gavel"></i>
	</button>
	{#if onImpersonate}
		<button
			class="btn btn-sm"
			title={m.teamMemberImpersonate()}
			aria-label={m.teamMemberImpersonate()}
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
		title={m.teamMemberRemove()}
		aria-label={m.teamMemberRemove()}
		onclick={(e) => {
			e.stopPropagation();
			onDelete();
		}}
	>
		<i aria-hidden="true" class="ph-duotone ph-trash"></i>
	</button>
</div>
