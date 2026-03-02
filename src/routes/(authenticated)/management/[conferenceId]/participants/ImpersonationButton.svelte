<script lang="ts">
	import { goto } from '$app/navigation';
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import { toast } from 'svelte-sonner';

	interface Props {
		userId: string;
		iconOnly?: boolean;
	}

	let { userId, iconOnly = false }: Props = $props();

	const StartImpersonationMutation = graphql(`
		mutation StartImpersonation($targetUserId: String!) {
			startImpersonation(targetUserId: $targetUserId)
		}
	`);

	let isLoading = $state(false);
	const startImpersonation = async () => {
		if (isLoading) return;
		isLoading = true;
		try {
			const promise = StartImpersonationMutation.mutate({ targetUserId: userId });
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
			await goto('/dashboard');
			window.location.reload();
		} catch (error) {
			console.error('Failed to start impersonation:', error);
			toast.error(m.impersonationFailed());
		} finally {
			isLoading = false;
		}
	};
</script>

<button
	class={iconOnly ? 'btn btn-ghost btn-sm btn-square' : 'btn'}
	onclick={startImpersonation}
	disabled={isLoading}
	aria-label={m.impersonation()}
>
	{#if isLoading}
		<i class="fa-duotone fa-spinner fa-spin"></i>
	{:else}
		<i class="fa-duotone fa-user-secret"></i>
	{/if}
	{#if !iconOnly}
		<span class="ml-2">{m.impersonation()}</span>
	{/if}
</button>
