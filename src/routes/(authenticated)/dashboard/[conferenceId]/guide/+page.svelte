<script lang="ts">
	import GuideRoute from './GuideRoute.svelte';
	import type { PageProps } from './$types';

	/** The guide, opened at its first page. */
	let { params: routeParams }: PageProps = $props();
	const conferenceId = $derived(routeParams.conferenceId);
</script>

<GuideRoute {conferenceId} />
