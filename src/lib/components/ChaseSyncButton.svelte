<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { chaseSyncNotice } from '#lib/helpers/chaseSync';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { m } from '#lib/paraglide/messages';

	/**
	 * "Sync now" for the CHASE link, shown to system admins only: this instance's link worker reads
	 * everything of CHASE again (`requestLinkSync`), and CHASE is asked to do the same with this one
	 * (`requestRemoteLinkSync`, server side: only the server holds the link token). CHASE being away
	 * does not fail the sync here; the toast says so. The last sync time shown next to it follows
	 * live through the link's row.
	 */
	let { small = false }: { small?: boolean } = $props();

	const currentUser = await getCurrentUser();
	let syncing = $state(false);

	/** A scalar mutation answers its value, which the client types as subscribeable. */
	const accepted = (value: unknown) => value === true;

	async function syncNow() {
		syncing = true;
		const [here, remote] = await Promise.allSettled([
			Promise.resolve(client.mutate.requestLinkSync()).then(accepted),
			Promise.resolve(client.mutate.requestRemoteLinkSync()).then(accepted)
		]);
		syncing = false;
		const notice = chaseSyncNotice({ here, remote });
		toast[notice.level](notice.message);
	}
</script>

{#if currentUser.isAdmin}
	<button
		type="button"
		class="btn btn-outline"
		class:btn-sm={small}
		onclick={syncNow}
		disabled={syncing}
	>
		<i
			aria-hidden="true"
			class="ph-duotone {syncing ? 'ph-spinner-gap animate-spin' : 'ph-arrows-clockwise'}"
		></i>
		{m.chaseLinkSyncNow()}
	</button>
{/if}
