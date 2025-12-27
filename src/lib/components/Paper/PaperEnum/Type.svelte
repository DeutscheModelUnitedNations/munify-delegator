<script lang="ts">
	import type { PaperType$options } from '$houdini';
	import { getPaperTypeIcon } from '$lib/services/enumIcons';
	import { translatePaperType } from '$lib/services/enumTranslations';
	import Common from './Common.svelte';

	interface Props {
		type: PaperType$options;
		vertical?: boolean;
	}

	let { type, vertical }: Props = $props();

	let color = $derived.by(() => {
		switch (type) {
			case 'POSITION_PAPER':
				return 'bg-primary text-primary-content';
			case 'WORKING_PAPER':
			case 'INTRODUCTION_PAPER':
			default:
				return 'bg-secondary text-secondary-content';
		}
	});

	let icon = $derived(getPaperTypeIcon(type));
</script>

<Common {icon} {vertical} text={translatePaperType(type)} classes={color} />
