<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { startImpersonation as impersonate } from '#lib/api/startImpersonation.js';

	interface Props {
		userId: string;
		iconOnly?: boolean;
	}

	let { userId, iconOnly = false }: Props = $props();

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

{#snippet button()}
	<button
		class={iconOnly ? 'btn btn-ghost btn-sm btn-square' : 'btn'}
		onclick={startImpersonation}
		disabled={isLoading}
		aria-label={m.impersonation()}
	>
		{#if isLoading}
			<i class="fa-sharp-duotone fa-solid fa-spinner fa-spin"></i>
		{:else}
			<i class="fa-sharp-duotone fa-solid fa-user-secret"></i>
		{/if}
		{#if !iconOnly}
			<span class="ml-2">{m.impersonation()}</span>
		{/if}
	</button>
{/snippet}

{#if allowed}
	{#if iconOnly}
		<div class="tooltip tooltip-bottom" data-tip={m.impersonation()}>
			{@render button()}
		</div>
	{:else}
		{@render button()}
	{/if}
{/if}
