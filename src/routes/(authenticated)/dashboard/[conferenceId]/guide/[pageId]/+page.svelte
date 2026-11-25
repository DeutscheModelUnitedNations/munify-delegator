<script lang="ts">
	import GuideRoute from '../GuideRoute.svelte';
	import type { PageProps } from './$types';

	/** One page of the guide. */
	let { params: routeParams }: PageProps = $props();
	const conferenceId = $derived(routeParams.conferenceId);
	const pageId = $derived(routeParams.pageId);
</script>

<GuideRoute {conferenceId} {pageId} />
