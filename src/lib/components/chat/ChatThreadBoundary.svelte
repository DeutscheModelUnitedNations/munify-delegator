<!--
	@component
	An open chat with what shows while it loads and when loading fails: `ChatThread` fetches
	itself, so whoever places one wraps it like this. Takes the thread's props.
-->
<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import LoadBoundary from '#lib/components/LoadBoundary.svelte';
	import ChatThread from './ChatThread.svelte';

	let props: ComponentProps<typeof ChatThread> = $props();
</script>

<LoadBoundary pendingClass="h-full">
	<ChatThread {...props} />
</LoadBoundary>
