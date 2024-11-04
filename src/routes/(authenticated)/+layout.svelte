<script lang="ts">
	import { apiClient, checkForError } from '$api/client.js';
	import { page } from '$app/stores';
	import { getApi } from '$lib/global/apiState.svelte.js';
	import { toast } from '@zerodevx/svelte-toast';
	import { onMount } from 'svelte';
	import * as m from '$lib/paraglide/messages.js';

	let { children, data } = $props();

	onMount(() => {
		if (!data.nextTokenRefreshDue) return;
		let timeout: any;

		function runTokenRefresh(nextDueDuration: number) {
			timeout = setTimeout(async () => {
				const res = await checkForError(
					apiClient({
						origin: $page.url.origin
					})['auth']['refresh-user'].get()
				);

				if (res.nextTokenRefreshDue) {
					// run next again 10 seconds before next expiry
					//TODO https://github.com/elysiajs/eden/issues/104
					runTokenRefresh(new Date(res.nextTokenRefreshDue).getTime() - Date.now() - 10 * 1000);
				}
			}, nextDueDuration);
		}

		// refresh the token 10 seconds before expiry
		runTokenRefresh(new Date(data.nextTokenRefreshDue).getTime() - Date.now() - 10 * 1000);

		(async () => {
			const errors = await checkForError(
				getApi().user({ id: data.user.sub })['is-data-complete'].get()
			);
			if (errors.length > 0) {
				toast.push({
					msg: m.pleaseFillOutYourProfileCorrectly() + ' ' + errors[0],
					duration: 10000
				});
			}
		})();

		return () => clearTimeout(timeout);
	});
</script>

{@render children()}
