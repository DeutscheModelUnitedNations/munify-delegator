<script lang="ts">
	import type { PaperType$options } from '$houdini';
	import { getPaperTypeIcon } from '$lib/services/enumIcons';
	import { translatePaperType } from '$lib/services/enumTranslations';
	import Common from './Common.svelte';

	interface Props {
		type: PaperType$options;
		size?: 'xs' | 'sm' | 'md';
	}

	let { type, size = 'sm' }: Props = $props();

	let color = $derived.by(() => {
		switch (type) {
			case 'POSITION_PAPER':
				return 'badge-primary badge-soft';
			case 'WORKING_PAPER':
				return 'badge-secondary badge-soft';
			case 'INTRODUCTION_PAPER':
			default:
				return 'badge-accent badge-soft';
		}
	});

	let icon = $derived(getPaperTypeIcon(type));
</script>

<Common {icon} {size} text={translatePaperType(type)} {color} />
