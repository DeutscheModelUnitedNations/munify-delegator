<script lang="ts">
	import AssignmentBadge from '#lib/components/tanStackTable/cells/AssignmentBadge.svelte';
	import type { ChasePresenceRepresentation } from '#lib/schemata/chasePresence.js';

	interface Props {
		representation: ChasePresenceRepresentation;
	}

	let { representation }: Props = $props();
</script>

{#if representation.type === 'DELEGATION'}
	<AssignmentBadge
		tooltip={representation.alpha2Code ?? ''}
		flagCode={representation.alpha2Code ?? undefined}
	/>
{:else if representation.type === 'NSA'}
	<AssignmentBadge tooltip={representation.name ?? ''} icon={representation.faIcon} />
{/if}
