<script lang="ts">
	import { apiClient, checkForError } from '$api/client.js';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	let { children, data } = $props();

	onMount(() => {
		if (!data.nextRefreshDue) return;
		let timeout: any;
		function runTokenRefresh(due: Date) {
			timeout = setTimeout(
				async () => {
					const res = await checkForError(
						apiClient({
							origin: $page.url.origin
						})['refresh-token'].get()
					);

					if (res.nextRefreshDue) {
						runTokenRefresh(res.nextRefreshDue);
					}
				},
				due.getTime() - Date.now() - 10 * 1000 // refresh the token 10 seconds before expiry
			);
		}
		runTokenRefresh(data.nextRefreshDue!);

		return () => clearTimeout(timeout);
	});
</script>

{@render children()}
