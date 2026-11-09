<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	interface Props {
		name: string;
		pronouns: string;
		participantType: 'delegation' | 'singleParticipant';
		/** Whether the student's application was sent in time. */
		applied: boolean;
	}

	let { name, pronouns, participantType, applied }: Props = $props();
</script>

<tr>
	<td class="font-medium whitespace-nowrap">{name}</td>
	<td>{pronouns}</td>
	<td class="whitespace-nowrap">
		{#if participantType === 'delegation'}
			<i class="ph-duotone ph-flag mr-2"></i>{m.delegation()}
		{:else}
			<i class="ph-duotone ph-user mr-2"></i>{m.singleParticipant()}
		{/if}
	</td>
	<td>
		{#if applied}
			<span class="badge badge-success gap-2 whitespace-nowrap">
				<i class="ph-duotone ph-check-circle"></i>{m.inSelectionProcess()}
			</span>
		{:else}
			<span class="badge badge-warning gap-2 whitespace-nowrap">
				<i class="ph-duotone ph-warning"></i>{m.notInSelectionProcess()}
			</span>
		{/if}
	</td>
</tr>
