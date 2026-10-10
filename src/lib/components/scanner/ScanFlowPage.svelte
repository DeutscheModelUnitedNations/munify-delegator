<script lang="ts" generics="S">
	import type { BarcodeFormat } from 'barcode-detector';
	import hotkeys from 'hotkeys-js';
	import { onDestroy, onMount, untrack, type Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import BarcodeScanner from '$lib/components/scanner/BarcodeScanner.svelte';
	import ScanPageHeader from '$lib/components/scanner/ScanPageHeader.svelte';
	import ScanResultPanel from '$lib/components/scanner/ScanResultPanel.svelte';
	import ScanHistory, { type ScanHistoryEntry } from '$lib/components/scanner/ScanHistory.svelte';
	import type { ScannedUserData, ScannedUserFlow } from './scannedUserFlow.svelte';

	interface Props {
		flow: ScannedUserFlow<S>;
		conferenceId: string;
		/** Explanation at the top of the page */
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
		/** Label of the card's primary button, also bound to alt+a */
		confirmLabel: string;
		onConfirm: () => void;
		/** Closes the card; bound to Esc */
		onClose: () => void;
		/** Body of the scanned person's card */
		children: Snippet<[user: NonNullable<ScannedUserData<S>['user']>, status: S | null]>;
	}

	let {
		flow,
		conferenceId,
		description,
		header,
		barcodeFormats,
		persistKey,
		notFoundMessage,
		drawerTitle,
		drawerIcon,
		confirmLabel,
		onConfirm,
		onClose,
		children
	}: Props = $props();

	const HISTORY_LENGTH = 5;
	let history = $state<ScanHistoryEntry[]>([]);

	// Remember everyone whose data was shown, the latest first, each once
	$effect(() => {
		const user = flow.current?.user;
		if (!user) return;
		const entry = {
			id: user.id,
			name: [user.givenName, user.familyName].filter(Boolean).join(' ') || user.id
		};
		untrack(() => {
			history = [entry, ...history.filter((e) => e.id !== entry.id)].slice(0, HISTORY_LENGTH);
		});
	});

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

<div class="flex w-full min-w-0 flex-col gap-4 md:gap-6 md:p-10">
	<ScanPageHeader {description} />

	{@render header?.()}

	<BarcodeScanner
		bind:this={flow.scanner}
		bind:scannedCode={flow.queryUserId}
		{barcodeFormats}
		{persistKey}
		{conferenceId}
		manualPlaceholder={m.enterPostalRegistrationCode()}
		scanPromptText={m.scanPostalRegistrationCodePrompt()}
	>
		{#snippet belowCamera()}
			<ScanHistory
				entries={history}
				activeId={flow.queryUserId}
				onSelect={(id) => (flow.queryUserId = id)}
			/>
		{/snippet}
		{#snippet result()}
			<ScanResultPanel
				{flow}
				{notFoundMessage}
				{drawerTitle}
				{drawerIcon}
				{confirmLabel}
				{onConfirm}
				{onClose}
				{children}
			/>
		{/snippet}
	</BarcodeScanner>
</div>
