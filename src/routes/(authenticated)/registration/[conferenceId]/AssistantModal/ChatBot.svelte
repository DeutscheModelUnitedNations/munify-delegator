<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { fly } from 'svelte/transition';

	interface Props {
		children: Snippet;
		duration?: number;
		delay?: number;
	}

	let { children, duration = 300, delay = 0 }: Props = $props();

	let randId: string = $state<string>(Math.random().toString(36).substring(7));

	onMount(() => {
		setTimeout(() => {
			const chat = document.getElementById(randId);
			if (chat) {
				chat.scrollIntoView({ behavior: 'smooth', block: 'end' });
			}
		}, delay);
	});
</script>

<div class="chat chat-start w-full rounded-md" in:fly={{ x: -30, duration, delay }}>
	<div id={randId} class="chat-bubble bg-base-300 text-base-content flex flex-col gap-2">
		{@render children()}
	</div>
</div>
