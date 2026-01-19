<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	interface Props {
		delay?: number;
	}

	let { delay = 0 }: Props = $props();

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

<div
	id={randId}
	class="text-success flex items-center justify-center gap-3 pb-4"
	in:fly={{ y: 0, duration: 300, delay }}
>
	<i class="fa-solid fa-circle-check"></i>
	<p class="text-center tracking-wider uppercase">Chat beendet</p>
</div>
