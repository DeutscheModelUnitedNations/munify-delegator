<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { startImpersonation as impersonate } from '#lib/api/startImpersonation';

	/** The menu entry that signs the caller in as the person. */
	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();

	// Shown only where it would work: the API decides who may act as whom.
	const allowed = $derived(
		await client.query.canImpersonateUser({ __args: { targetUserId: userId } })
	);

	let isLoading = $state(false);
	const startImpersonation = async () => {
		if (isLoading) return;
		isLoading = true;
		try {
			await impersonate(userId);
		} finally {
			isLoading = false;
		}
	};
</script>

{#if allowed}
	<li>
		<button onclick={startImpersonation} disabled={isLoading}>
			<i
				aria-hidden="true"
				class="ph-duotone {isLoading ? 'ph-spinner-gap animate-spin' : 'ph-detective'}"
			></i>
			{m.impersonation()}
		</button>
	</li>
{/if}
