<script lang="ts">
	import type { PageProps } from './$types';
	import WeightsForm from './WeightsForm.svelte';

	let { params }: PageProps = $props();
</script>

{#key params.conferenceId}
	<WeightsForm conferenceId={params.conferenceId} />
{/key}
