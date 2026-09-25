<script lang="ts">
	import { goto } from '$app/navigation';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';

	type ImpersonationStatus = Awaited<ReturnType<typeof fetchStatus>>;

	function fetchStatus() {
		return client.query.impersonationStatus({
			isImpersonating: true,
			originalUser: { sub: true, email: true },
			impersonatedUser: { sub: true, email: true }
		});
	}

	let status = $state<ImpersonationStatus>();
	let isImpersonating = $derived(status?.isImpersonating || false);
	let isLoading = $state(false);

	$effect(() => {
		void fetchStatus().then((result) => {
			status = result;
		});
	});

	async function stopImpersonation() {
		if (isLoading) return;
		isLoading = true;
		const promise = Promise.resolve(client.mutate.stopImpersonation());
		toast.promise(promise, genericPromiseToastMessages);
		try {
			await promise;
			await goto('/dashboard');
			window.location.reload();
		} catch (error) {
			console.error('Failed to stop impersonation:', error);
		} finally {
			isLoading = false;
		}
	}
</script>

{#if isImpersonating}
	<div class="alert alert-warning mb-4 gap-4 shadow-lg" role="status" aria-live="polite">
		<i class="fa-solid fa-user-secret text-2xl"></i>
		<div class="text-warning-content w-full flex-1">
			<div class="font-bold">{m.impersonationActive()}</div>
			<div class="text-sm opacity-75">
				{m.youAreActingAs({
					impersonatedUser: status?.impersonatedUser?.email || 'unknown',
					originalUser: status?.originalUser?.email || 'unknown'
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
