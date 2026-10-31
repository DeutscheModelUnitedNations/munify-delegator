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
			<i class="fa-sharp-duotone fa-solid fa-flag mr-2"></i>{m.delegation()}
		{:else}
			<i class="fa-sharp-duotone fa-solid fa-user mr-2"></i>{m.singleParticipant()}
		{/if}
	</td>
	<td>
		{#if applied}
			<span class="badge badge-success gap-2 whitespace-nowrap">
				<i class="fa-sharp-duotone fa-solid fa-circle-check"></i>{m.inSelectionProcess()}
			</span>
		{:else}
			<span class="badge badge-warning gap-2 whitespace-nowrap">
				<i class="fa-sharp-duotone fa-solid fa-exclamation-triangle"></i>{m.notInSelectionProcess()}
			</span>
		{/if}
	</td>
</tr>
