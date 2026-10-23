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
	<td class="font-medium whitespace-nowrap">{name}</td>
	<td>{pronouns}</td>
	<td class="whitespace-nowrap"><i class="fa-duotone {typeIcon} mr-2"></i>{typeLabel}</td>
	<td>
		{#if applied}
			<span class="badge badge-success gap-2 whitespace-nowrap">
				<i class="fa-solid fa-circle-check"></i>{m.inSelectionProcess()}
			</span>
		{:else}
			<span class="badge badge-warning gap-2 whitespace-nowrap">
				<i class="fa-solid fa-exclamation-triangle"></i>{m.notInSelectionProcess()}
			</span>
		{/if}
	</td>
</tr>
