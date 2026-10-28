<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Kbd from '#lib/components/Kbd.svelte';
	import { mayRecordAnyway, type ShownPerson } from './attendanceSession';
	import type { ScanIssue } from './scanCheck';

	/** The buttons under a scanned person: what the scanner waits for decides which. */
	interface Props {
		awaiting: NonNullable<ShownPerson['awaiting']>;
		issues: ScanIssue[];
		busy: boolean;
		onConfirm: () => void;
		/** Records the person despite the open points (check mode). */
		onRecordAnyway: () => void;
		onClose: () => void;
	}

	let { awaiting, issues, busy, onConfirm, onRecordAnyway, onClose }: Props = $props();
</script>

<footer class="mb-0! flex flex-wrap gap-2 pt-2">
	{#if awaiting === 'decide'}
		<!-- Open points: not recorded unless asked for; dismissing is the usual way on -->
		<button class="btn flex-1 btn-error" onclick={onClose}>
			<i class="fa-sharp-duotone fa-solid fa-xmark"></i>
			{m.dismiss()}
			<Kbd hotkey="Esc" />
		</button>
		{#if mayRecordAnyway(issues)}
			<button class="btn btn-success btn-sm self-center" onclick={onRecordAnyway}>
				<i class="fa-sharp-duotone fa-solid fa-check"></i>
				{m.scanRecordAnyway()}
				<Kbd hotkey="alt+a" />
			</button>
		{/if}
	{:else}
		<button class="btn flex-1 btn-primary" onclick={onConfirm} disabled={busy}>
			<i class="fa-sharp-duotone fa-solid fa-check"></i>
			{awaiting === 'badge' ? m.saveAndNext() : m.scanContinue()}
			<Kbd hotkey="alt+a" />
		</button>
		<!-- Open points are acknowledged with the main button; only a card still to be stored can be given up -->
		{#if awaiting === 'badge'}
			<button class="btn btn-error" onclick={onClose}>
				<i class="fa-sharp-duotone fa-solid fa-xmark"></i>
				{m.cancel()}
				<Kbd hotkey="Esc" />
			</button>
		{/if}
	{/if}
</footer>
