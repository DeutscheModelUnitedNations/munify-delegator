<script lang="ts">
	import AimMarks from './AimMarks.svelte';
	import ScanAlert from './ScanAlert.svelte';
	import type { PageAim } from './pageCamera.svelte';

	/** Over the picture while pages are read: their marks, the flash, and what is wrong. */
	interface Props {
		aim: PageAim;
	}

	let { aim }: Props = $props();
</script>

<AimMarks marks={aim.marks} />
<ScanAlert flash={aim.flash} problem={aim.problem} onresume={aim.onresume} />
