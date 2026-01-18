<script lang="ts">
	import { dev } from '$app/environment';
	import { goto } from '$app/navigation';
	import { configPublic } from '$config/public';
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { headerState } from '$lib/services/authenticatedHeaderStatus.svelte';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import { toast } from 'svelte-sonner';
	import Breadcrumbs from './Breadcrumbs.svelte';

	//TODO
	// import ExportButtons from '$lib/components/DataTable/ExportButtons.svelte';
	// import SettingsButton from './DataTable/SettingsButton.svelte';

	export const logoutUrlQuery = graphql(`
		query LogoutUrlQuery {
			logoutUrl
		}
	`);

	const checkImpersonationStatusQuery = graphql(`
		query checkImpersonationStatusHeader {
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
		mutation StopImpersonationHeader {
			stopImpersonation
		}
	`);

	let impersonationStatus = $derived($checkImpersonationStatusQuery?.data?.impersonationStatus);
	let isImpersonating = $derived(impersonationStatus?.isImpersonating || false);
	let isStoppingImpersonation = $state(false);
	let isImpersonationButtonHovered = $state(false);
	let impersonationButtonEl: HTMLButtonElement | null = $state(null);
	let tooltipPosition = $derived.by(() => {
		if (!impersonationButtonEl || !isImpersonationButtonHovered) return { top: 0, right: 0 };
		const rect = impersonationButtonEl.getBoundingClientRect();
		return {
			top: rect.bottom + 8,
			right: window.innerWidth - rect.right
		};
	});

	async function stopImpersonation() {
		if (isStoppingImpersonation) return;
		isStoppingImpersonation = true;
		const promise = stopImpersonationMutation.mutate(null);
		toast.promise(promise, genericPromiseToastMessages);
		try {
			await promise;
			await goto('/dashboard');
			window.location.reload();
		} catch (error) {
			console.error('Failed to stop impersonation:', error);
		} finally {
			isStoppingImpersonation = false;
		}
	}

	$effect(() => {
		logoutUrlQuery.fetch();
		checkImpersonationStatusQuery.fetch();
	});
</script>

<div class="w-full p-4">
	<div
		class="no-print navbar bg-base-200 border-base-300 border-1 mb-4 justify-between gap-0 rounded-box px-4 py-2 sm:gap-2 {isImpersonating
			? 'shadow-[0_0_15px_rgba(234,179,8,0.6)] border-yellow-500 !bg-yellow-200/70 dark:!bg-yellow-900/50'
			: dev
				? 'shadow-[0_0_15px_rgba(255,0,0,0.6)] border-red-500 !bg-red-200/70 dark:!bg-red-900/50'
				: ''}"
	>
		{#if headerState.openNavCallback !== undefined}
			<button
				class="sm:hidden"
				aria-label="Toggle navigation menu"
				onclick={() => {
					if (headerState.openNavCallback) {
						headerState.openNavCallback();
					}
					headerState.openNavCallback = undefined;
				}}
			>
				<i class="fa-duotone fa-bars mr-3 text-xl"></i>
			</button>
		{/if}

		<Breadcrumbs />

		<div class="flex items-center gap-1">
			{#if isImpersonating}
				<!-- Unified impersonation button: shows info on hover, click to stop -->
				<button
					bind:this={impersonationButtonEl}
					class="btn btn-square btn-warning"
					onclick={stopImpersonation}
					onmouseenter={() => (isImpersonationButtonHovered = true)}
					onmouseleave={() => (isImpersonationButtonHovered = false)}
					disabled={isStoppingImpersonation}
					aria-label={m.stopImpersonation()}
				>
					{#if isStoppingImpersonation}
						<i class="fa-solid fa-spinner fa-spin text-xl"></i>
					{:else if isImpersonationButtonHovered}
						<i class="fa-solid fa-xmark text-xl"></i>
					{:else}
						<i class="fa-solid fa-user-secret text-xl"></i>
					{/if}
				</button>

				<!-- Fixed tooltip -->
				{#if isImpersonationButtonHovered}
					<div
						class="fixed z-50 rounded-box bg-neutral px-3 py-2 text-sm text-neutral-content shadow-lg"
						style="top: {tooltipPosition.top}px; right: {tooltipPosition.right}px;"
					>
						{m.youAreActingAs({
							impersonatedUser: impersonationStatus?.impersonatedUser?.email || 'unknown',
							originalUser: impersonationStatus?.originalUser?.email || 'unknown'
						})}
					</div>
				{/if}
			{/if}

			<div class="dropdown dropdown-end z-10">
				<div tabindex="-1" class="btn btn-square btn-ghost">
					<i class="fa-duotone fa-user text-xl"></i>
				</div>
				<ul
					tabindex="-1"
					class="menu dropdown-content rounded-box bg-base-100 mt-3 w-52 p-2 shadow-2xl"
				>
					<li>
						<a href="/dashboard">
							<i class="fa-duotone fa-grid-2 w-4"></i>
							{m.dashboard()}
						</a>
					</li>
					<li>
						<a href="/my-account">
							<i class="fa-duotone fa-user w-4"></i>
							{m.profileSettings()}
						</a>
					</li>
					<li>
						<a
							class={$logoutUrlQuery.data?.logoutUrl ? '' : 'disabled'}
							href={$logoutUrlQuery.data?.logoutUrl}
						>
							<i class="fa-duotone fa-sign-out w-4"></i>
							{m.logout()}
						</a>
					</li>
					{#if configPublic.PUBLIC_FEEDBACK_URL}
						<li>
							<a href={configPublic.PUBLIC_FEEDBACK_URL} target="_blank">
								<i class="fa-duotone fa-comment w-4"></i>
								{m.feedback()}
							</a>
						</li>
					{/if}
				</ul>
			</div>
		</div>
	</div>
</div>
