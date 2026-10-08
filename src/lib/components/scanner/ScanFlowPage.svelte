<script lang="ts" generics="S">
	import type { BarcodeFormat } from 'barcode-detector';
	import hotkeys from 'hotkeys-js';
	import { onDestroy, onMount, type Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import BarcodeScanner from '$lib/components/scanner/BarcodeScanner.svelte';
	import TopDrawer from '$lib/components/TopDrawer.svelte';
	import Kbd from '$lib/components/Kbd.svelte';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import type { ScannedUserData, ScannedUserFlow } from './scannedUserFlow.svelte';

	interface Props {
		flow: ScannedUserFlow<S>;
		/** Page heading */
		title: string;
		/** Explanation under the heading */
		description: Snippet;
		/** Controls between the description and the scanner */
		header?: Snippet;
		barcodeFormats: BarcodeFormat[];
		/** Key the scanner persists its camera preference under */
		persistKey: string;
		/** Shown when the scanned code matches nobody */
		notFoundMessage: string;
		drawerTitle: string;
		drawerIcon: string;
		drawerMaxWidth?: string;
		/** Label of the drawer's primary button, also bound to alt+a */
		confirmLabel: string;
		onConfirm: () => void;
		/** Closes the drawer; bound to Esc */
		onClose: () => void;
		/** Drawer body for the scanned person */
		children: Snippet<[user: NonNullable<ScannedUserData<S>['user']>, status: S | null]>;
	}

	let {
		flow,
		title,
		description,
		header,
		barcodeFormats,
		persistKey,
		notFoundMessage,
		drawerTitle,
		drawerIcon,
		drawerMaxWidth,
		confirmLabel,
		onConfirm,
		onClose,
		children
	}: Props = $props();

	onMount(() => {
		hotkeys('esc', () => {
			onClose();
		});

		hotkeys('alt+a', () => {
			if (flow.canConfirm) onConfirm();
		});
	});

	onDestroy(() => {
		hotkeys.unbind('esc');
		hotkeys.unbind('alt+a');
	});
</script>

<div class="flex w-full max-w-3xl flex-col gap-6 md:p-10">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{title}</h2>
		<p class="text-base-content/70 leading-relaxed">{@render description()}</p>
	</div>

	{@render header?.()}

	<BarcodeScanner
		bind:this={flow.scanner}
		bind:scannedCode={flow.queryUserId}
		{barcodeFormats}
		{persistKey}
		manualPlaceholder={m.enterPostalRegistrationCode()}
		scanPromptText={m.scanPostalRegistrationCodePrompt()}
	/>

	<!-- Loading / error state -->
	{#if flow.queryUserId && flow.loading}
		<div class="text-base-content/70 flex items-center gap-3">
			<span class="loading loading-spinner loading-sm"></span>
			<span class="font-mono text-sm">{flow.queryUserId}</span>
		</div>
	{:else if flow.queryUserId && !flow.data?.user}
		<div role="alert" class="alert alert-warning alert-soft">
			<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-lg"></i>
			<span>{notFoundMessage}</span>
			<button class="btn btn-ghost btn-sm" onclick={onClose}>{m.close()}</button>
		</div>
	{/if}
</div>

<!-- Top drawer overlay for user data -->
<TopDrawer
	bind:open={flow.drawerOpen}
	title={drawerTitle}
	titleIcon={drawerIcon}
	maxWidth={drawerMaxWidth}
>
	{#snippet headerActions()}
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
			class="btn btn-ghost btn-sm btn-square"
			onclick={() => onClose()}
			aria-label={m.close()}
		>
			<i class="fa-sharp-duotone fa-solid fa-xmark text-lg"></i>
		</button>
	{/snippet}

	{@const current = flow.current}
	{#if current?.user}
		{@render children(current.user, current.status)}
	{/if}

	{#snippet footer()}
		<button class="btn btn-primary flex-1" onclick={onConfirm} disabled={flow.busy}>
			<i class="fa-sharp-duotone fa-solid fa-check"></i>
			{confirmLabel}
			<Kbd hotkey="alt+a" />
		</button>
		<button class="btn btn-error" onclick={onClose}>
			<i class="fa-sharp-duotone fa-solid fa-xmark"></i>
			{m.close()}
			<Kbd hotkey="Esc" />
		</button>
	{/snippet}
</TopDrawer>
