<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { IMPERSONATION_ENABLED } from '$lib/data/impersonation';
	import { startImpersonation as impersonate } from '$lib/api/startImpersonation';

	interface Props {
		userId: string;
		iconOnly?: boolean;
	}

	let { userId, iconOnly = false }: Props = $props();

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

{#if IMPERSONATION_ENABLED}
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
{/if}
