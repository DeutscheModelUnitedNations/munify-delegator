<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import Kbd from '#lib/components/Kbd.svelte';
	import type { ShownPerson } from './attendanceSession';

	/** The buttons under a scanned person: what the scanner waits for decides which. */
	interface Props {
		awaiting: NonNullable<ShownPerson['awaiting']>;
		/** Whether the server lets the person be recorded despite the open points. */
		mayRecordAnyway: boolean;
		busy: boolean;
		onConfirm: () => void;
		/** Records the person despite the open points (check mode). */
		onRecordAnyway: () => void;
		onClose: () => void;
	}

	let { awaiting, mayRecordAnyway, busy, onConfirm, onRecordAnyway, onClose }: Props = $props();
</script>

<footer class="mb-0! flex flex-wrap gap-2 pt-2">
	{#if awaiting === 'decide'}
		<!-- Open points: not recorded unless asked for; dismissing is the usual way on -->
		<button class="btn flex-1 btn-error" onclick={onClose}>
			<i class="fa-sharp-duotone fa-solid fa-xmark"></i>
			{m.dismiss()}
			<Kbd hotkey="Esc" />
		</button>
		{#if mayRecordAnyway}
			<button class="btn btn-success btn-sm self-center" onclick={onRecordAnyway}>
				<i class="fa-sharp-duotone fa-solid fa-check"></i>
				{m.scanRecordAnyway()}
				<Kbd hotkey="alt+a" />
			</button>
		{/if}
	{:else}
		<button class="btn flex-1 btn-primary" onclick={onConfirm} disabled={busy}>
			<i class="fa-sharp-duotone fa-solid fa-check"></i>
			{m.scanContinue()}
			<Kbd hotkey="alt+a" />
		</button>
	{/if}
</footer>
