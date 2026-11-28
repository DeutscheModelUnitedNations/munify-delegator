<script lang="ts">
	import type { PageCameraHint } from './pageCamera.svelte';
	import { describeHint } from './pageCameraHints';

	interface Props {
		hint: PageCameraHint;
	}

	let { hint }: Props = $props();
	const busy = $derived(hint.kind === 'reading' || hint.kind === 'ready');
</script>

<!-- pages are read one after the other, also while a person is shown -->
<i
	aria-hidden="true"
	class="ph-duotone {busy ? 'ph-spinner animate-spin' : 'ph-file-magnifying-glass'}"
></i>
<span class="truncate" role="status">{describeHint(hint)}</span>
