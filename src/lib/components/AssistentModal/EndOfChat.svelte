<script lang="ts">
	import { fly } from 'svelte/transition';

	interface Props {
		delay?: number;
	}

	let { delay = 0 }: Props = $props();
</script>

<div
	class="flex gap-3 justify-center items-center text-success mt-4"
	in:fly={{ y: 0, duration: 300, delay }}
>
	<i class="fa-solid fa-circle-check"></i>
	<p class="text-center uppercase tracking-wider">Chat beendet</p>
</div>
