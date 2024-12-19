<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import type { Snippet } from 'svelte';
	import TaskAlertCard from './TaskAlertCard.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<section class="flex flex-col gap-4">
	<h2 class="text-2xl font-bold">{m.currentTasks()}</h2>
	{@render children()}
</section>
