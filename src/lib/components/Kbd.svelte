<script lang="ts">
	import { browser } from '$app/environment';
	import { formatHotkey } from './formatHotkey';

	interface Props {
		hotkey: string;
		size?: 'xs' | 'sm';
	}

	let { hotkey, size = 'sm' }: Props = $props();

	const isMac = browser && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

	const formatted = $derived(formatHotkey(hotkey, isMac));
</script>

<span class="kbd kbd-{size} hidden md:inline-flex">{formatted}</span>
