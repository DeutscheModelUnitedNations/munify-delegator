<script lang="ts">
	import { apiClient, checkForError } from '$api/client.js';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let { children, data } = $props();

	onMount(() => {
		if (!data.nextRefreshDue) return;
		let timeout: any;

		function runTokenRefresh(nextDueDuration: number) {
			timeout = setTimeout(async () => {
				const res = await checkForError(
					apiClient({
						origin: $page.url.origin
					})['refresh-token'].get()
				);

				if (res.nextRefreshDue) {
					// run next again 10 seconds before next expiry
					//TODO https://github.com/elysiajs/eden/issues/104
					runTokenRefresh(new Date(res.nextRefreshDue).getTime() - Date.now() - 10 * 1000);
				}
			}, nextDueDuration);
		}

		// refresh the token 10 seconds before expiry
		runTokenRefresh(data.nextRefreshDue.getTime() - Date.now() - 10 * 1000);

		return () => clearTimeout(timeout);
	});
</script>

{@render children()}
