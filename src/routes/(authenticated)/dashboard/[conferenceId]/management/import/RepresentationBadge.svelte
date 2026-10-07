<script lang="ts">
	import AssignmentBadge from '$lib/components/tanStackTable/cells/AssignmentBadge.svelte';

	interface Props {
		representation: {
			type: 'DELEGATION' | 'NSA' | 'UN';
			alpha2Code?: string;
			faIcon?: string;
			name?: string;
		};
	}

	let { representation }: Props = $props();
</script>

{#if representation.type === 'DELEGATION'}
	<AssignmentBadge tooltip={representation.alpha2Code ?? ''} flagCode={representation.alpha2Code} />
{:else if representation.type === 'NSA'}
	<AssignmentBadge tooltip={representation.name ?? ''} icon={representation.faIcon} />
{/if}
