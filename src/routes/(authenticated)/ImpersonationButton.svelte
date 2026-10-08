<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';

	/**
	 * Shown while impersonating someone: hovering tells whom, clicking stops the impersonation.
	 */
	interface Props {
		impersonatedEmail?: string | null;
		originalEmail?: string | null;
	}

	let { impersonatedEmail, originalEmail }: Props = $props();

	let isStoppingImpersonation = $state(false);
	let isHovered = $state(false);
	let buttonEl: HTMLButtonElement | null = $state(null);
	let tooltipPosition = $derived.by(() => {
		if (!buttonEl || !isHovered) return { top: 0, right: 0 };
		const rect = buttonEl.getBoundingClientRect();
		return {
			top: rect.bottom + 8,
			right: window.innerWidth - rect.right
		};
	});

	async function stopImpersonation() {
		if (isStoppingImpersonation) return;
		isStoppingImpersonation = true;
		const promise = Promise.resolve(client.mutate.stopImpersonation());
		toast.promise(promise, genericPromiseToastMessages);
		try {
			await promise;
			await goto(resolve('/dashboard'));
			window.location.reload();
		} catch (error) {
			console.error('Failed to stop impersonation:', error);
		} finally {
			isStoppingImpersonation = false;
		}
	}
</script>

<!-- Unified impersonation button: shows info on hover, click to stop -->
<button
	bind:this={buttonEl}
	class="btn btn-square btn-warning"
	onclick={stopImpersonation}
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
	disabled={isStoppingImpersonation}
	aria-label={m.stopImpersonation()}
>
	{#if isStoppingImpersonation}
		<i class="fa-sharp-duotone fa-solid fa-spinner fa-spin text-xl"></i>
	{:else if isHovered}
		<i class="fa-sharp-duotone fa-solid fa-xmark text-xl"></i>
	{:else}
		<i class="fa-sharp-duotone fa-solid fa-user-secret text-xl"></i>
	{/if}
</button>

<!-- Fixed tooltip -->
{#if isHovered}
	<div
		class="fixed z-50 rounded-box bg-neutral px-3 py-2 text-sm text-neutral-content shadow-lg"
		style="top: {tooltipPosition.top}px; right: {tooltipPosition.right}px;"
	>
		{m.youAreActingAs({
			impersonatedUser: impersonatedEmail || 'unknown',
			originalUser: originalEmail || 'unknown'
		})}
	</div>
{/if}
