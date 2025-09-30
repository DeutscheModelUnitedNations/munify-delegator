<script lang="ts">
	import { goto } from '$app/navigation';
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import toast from 'svelte-french-toast';

	const checkImpersonationStatusQuery = graphql(`
		query checkImpersonationStatus {
			impersonationStatus {
				isImpersonating
				originalUser {
					sub
					email
				}
				impersonatedUser {
					sub
					email
				}
			}
		}
	`);

	const stopImpersonationMutation = graphql(`
		mutation StopImpersonation {
			stopImpersonation
		}
	`);

	let status = $derived($checkImpersonationStatusQuery?.data?.impersonationStatus);
	let isImpersonating = $derived(status?.isImpersonating || false);
	let isLoading = $state(false);

	$effect(() => {
		checkImpersonationStatusQuery.fetch();
	});

	async function stopImpersonation() {
		if (isLoading) return;
		isLoading = true;
		toast
			.promise(stopImpersonationMutation.mutate(null), genericPromiseToastMessages)
			.then(() => {
				goto('/management').then(() => window.location.reload());
			})
			.catch((error) => {
				console.error('Failed to stop impersonation:', error);
			})
			.finally(() => {
				isLoading = false;
			});
	}
</script>

{#if isImpersonating}
	<div class="alert alert-warning mb-4 gap-4 shadow-lg">
		<i class="fa-solid fa-user-secret text-2xl"></i>
		<div class="text-warning-content w-full flex-1">
			<div class="font-bold">{m.impersonationActive()}</div>
			<div class="text-sm opacity-75">
				{m.youAreActingAs({
					impersonatedUser: status.impersonatedUser?.email || 'unknown',
					originalUser: status.originalUser?.email || 'unknown'
				})}
			</div>
		</div>
		<button class="btn btn-outline btn-sm" onclick={stopImpersonation} disabled={isLoading}>
			{#if isLoading}
				<i class="fa-solid fa-spinner fa-spin"></i>
			{:else}
				<i class="fa-solid fa-xmark"></i>
			{/if}
			{m.stopImpersonation()}
		</button>
	</div>
{/if}
