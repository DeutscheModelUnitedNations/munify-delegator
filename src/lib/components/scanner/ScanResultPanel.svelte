<script lang="ts" generics="S">
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import Kbd from '$lib/components/Kbd.svelte';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import type { ScannedUserData, ScannedUserFlow } from './scannedUserFlow.svelte';

	interface Props {
		flow: ScannedUserFlow<S>;
		/** Shown when the scanned code matches nobody */
		notFoundMessage: string;
		drawerTitle: string;
		drawerIcon: string;
		/** Label of the primary button, also bound to alt+a */
		confirmLabel: string;
		onConfirm: () => void;
		/** Closes the result; bound to Esc */
		onClose: () => void;
		/** Body for the scanned person */
		children: Snippet<[user: NonNullable<ScannedUserData<S>['user']>, status: S | null]>;
	}

	let {
		flow,
		notFoundMessage,
		drawerTitle,
		drawerIcon,
		confirmLabel,
		onConfirm,
		onClose,
		children
	}: Props = $props();

	const current = $derived(flow.drawerOpen ? flow.current : undefined);
</script>

{#if current?.user}
	<section
		class="flow-root min-w-0 rounded-box bg-base-200/60 p-2 md:p-6 [&>:not(header)]:mb-2 md:[&>:not(header)]:mb-4"
		aria-label={drawerTitle}
	>
		<header class="float-right mb-2 ml-3 flex gap-2">
			<div class="contents">
				<button
					class="btn btn-soft btn-sm"
					onclick={() => {
						if (flow.queryUserId) openUserCard(flow.queryUserId);
					}}
					aria-label={m.details()}
				>
					<i class="fa-sharp-duotone fa-solid fa-id-card"></i>
				</button>
				<button
					type="button"
					class="btn btn-square btn-ghost btn-sm"
					onclick={() => onClose()}
					aria-label={m.close()}
				>
					<i class="fa-sharp-duotone fa-solid fa-xmark text-lg"></i>
				</button>
			</div>
		</header>

		{@render children(current.user, current.status)}

		<footer class="mb-0! flex flex-wrap gap-2 pt-2">
			<button class="btn flex-1 btn-primary" onclick={onConfirm} disabled={flow.busy}>
				<i class="fa-sharp-duotone fa-solid fa-check"></i>
				{confirmLabel}
				<Kbd hotkey="alt+a" />
			</button>
			<button class="btn btn-error" onclick={onClose}>
				<i class="fa-sharp-duotone fa-solid fa-xmark"></i>
				{m.close()}
				<Kbd hotkey="Esc" />
			</button>
		</footer>
	</section>
{:else}
	<!-- Nothing to show yet: loading, not found, or waiting for the first scan -->
	<div class="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
		{#if flow.queryUserId && flow.loading}
			<span class="loading loading-md loading-spinner"></span>
			<span class="font-mono text-sm text-base-content/70">{flow.queryUserId}</span>
		{:else if flow.queryUserId && !flow.data?.user}
			<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-3xl text-warning"></i>
			<p class="text-base-content/80">{notFoundMessage}</p>
			<button class="btn btn-ghost btn-sm" onclick={onClose}>{m.close()}</button>
		{:else}
			<i class="fa-sharp-duotone fa-solid {drawerIcon} text-4xl text-base-content/30"></i>
			<p class="text-sm text-base-content/60">{m.scanResultPlaceholder()}</p>
		{/if}
	</div>
{/if}
