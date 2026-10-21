<script lang="ts">
	import Flag from '#lib/components/Flag.svelte';
	import { splitRole, type ConferenceRoleKind } from '#lib/helpers/conferenceRole.js';

	interface Props {
		/** A delegation's role: a nation shows its flag, a non-state actor its icon, anything else nothing. */
		role:
			| {
					kind: ConferenceRoleKind;
					fontAwesomeIcon?: string | null;
					nation?: { alpha2Code: string } | null;
			  }
			| null
			| undefined;
		size?: 'xs' | 'sm' | 'md' | 'lg';
	}

	let { role, size = 'xs' }: Props = $props();

	let { nation, nonStateActor } = $derived(splitRole(role));
</script>

{#if nation}
	<Flag {size} alpha2Code={nation.alpha2Code} />
{:else if nonStateActor}
	<Flag {size} nsa={true} icon={nonStateActor.fontAwesomeIcon} />
{/if}
