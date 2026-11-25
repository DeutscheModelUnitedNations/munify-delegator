<script lang="ts">
	import FormalitiesStatusIcon from './FormalitiesStatusIcon.svelte';

	/** The formalities tab's icon, which stays the usual one while the statuses load or fail to. */
	interface Props {
		icon: string;
		userId: string;
		conferenceId: string;
		isConferenceSupervisor: boolean;
	}

	let props: Props = $props();
</script>

{#snippet usual()}
	<i aria-hidden="true" class="ph-duotone {props.icon} text-lg"></i>
{/snippet}

<svelte:boundary>
	<FormalitiesStatusIcon {...props} />
	{#snippet pending()}{@render usual()}{/snippet}
	{#snippet failed()}{@render usual()}{/snippet}
</svelte:boundary>
