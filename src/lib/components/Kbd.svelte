<script lang="ts">
	import { browser } from '$app/environment';

	interface Props {
		hotkey: string;
		size?: 'xs' | 'sm';
	}

	let { hotkey, size = 'sm' }: Props = $props();

	const isMac = browser && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

	const macModifiers: Record<string, string> = {
		alt: '\u2325',
		shift: '\u21E7',
		ctrl: '\u2303',
		mod: '\u2318',
		enter: '\u21B5'
	};

	const formatted = $derived(
		hotkey
			.split('+')
			.map((part) => {
				const key = part.trim().toLowerCase();
				if (key === 'mod') return isMac ? '\u2318' : 'Ctrl';
				return isMac && macModifiers[key] ? macModifiers[key] : part.trim();
			})
			.join(isMac ? '' : '+')
	);
</script>

<span class="kbd kbd-{size}">{formatted}</span>
