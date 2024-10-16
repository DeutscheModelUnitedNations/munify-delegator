<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';

	interface Props {
		children: Snippet;
		duration?: number;
		delay?: number;
	}

	let { children, duration = 300, delay = 0 }: Props = $props();
</script>

<div class="chat chat-end w-full rounded-md" in:fly={{ x: 30, duration, delay }}>
	<div class="chat-bubble flex flex-col gap-2 bg-base-300 text-base-content">
		{@render children()}
	</div>
</div>
