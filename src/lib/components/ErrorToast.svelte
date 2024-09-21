<script lang="ts">
	import { SvelteToast } from '@zerodevx/svelte-toast';
	import { toast } from '@zerodevx/svelte-toast';
	import { onMount } from 'svelte';

	// onMount(() => {
	// 	if (window) {
	// 		const handler = ({ message }: ErrorEvent) => {
	// 			toast.push({
	// 				msg: message
	// 			});
	// 		};
	// 		window.addEventListener('error', handler);

	// 		return () => window.removeEventListener('error', handler);
	// 	}
	// });
</script>

<SvelteToast options={{}} />
