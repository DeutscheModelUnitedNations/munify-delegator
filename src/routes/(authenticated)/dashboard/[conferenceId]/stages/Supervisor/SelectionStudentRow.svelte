<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	interface Props {
		name: string;
		pronouns: string;
		participantType: 'delegation' | 'singleParticipant';
		applied: boolean;
	}

	let { name, pronouns, participantType, applied }: Props = $props();

	let typeLabel = $derived(
		participantType === 'delegation' ? m.delegation() : m.singleParticipant()
	);
	let typeIcon = $derived(participantType === 'delegation' ? 'fa-flag' : 'fa-user');
</script>

<tr>
	<td class="font-medium">{name}</td>
	<td>{pronouns}</td>
	<td><i class="fa-duotone {typeIcon} mr-2"></i>{typeLabel}</td>
	<td>
		{#if applied}
			<span class="badge badge-success">
				<i class="fa-solid fa-circle-check mr-2"></i>{m.applicationCompletedTitle()}
			</span>
		{:else}
			<span class="badge badge-warning">
				<i class="fa-solid fa-exclamation-triangle mr-2"></i>{m.applicationNotCompletedTitle()}
			</span>
		{/if}
	</td>
	<td>
		{#if applied}
			<span class="text-success">
				<i class="fa-duotone fa-hourglass-half mr-2"></i>{m.inSelectionProcess()}
			</span>
		{:else}
			<span class="text-base-content/60">
				<i class="fa-duotone fa-circle-xmark mr-2"></i>{m.notInSelectionProcess()}
			</span>
		{/if}
	</td>
</tr>
