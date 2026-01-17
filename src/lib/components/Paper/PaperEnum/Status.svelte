<script lang="ts">
	import type { PaperStatus$options } from '$houdini';
	import { getPaperStatusIcon } from '$lib/services/enumIcons';
	import { translatePaperStatus } from '$lib/services/enumTranslations';
	import Common from './Common.svelte';

	interface Props {
		status: PaperStatus$options;
		size?: 'xs' | 'sm' | 'md';
	}

	let { status, size = 'sm' }: Props = $props();

	let color = $derived.by(() => {
		switch (status) {
			case 'SUBMITTED':
				return 'badge-warning badge-soft';
			case 'REVISED':
				return 'badge-info badge-soft';
			case 'CHANGES_REQUESTED':
				return 'badge-error badge-soft';
			case 'ACCEPTED':
				return 'badge-success badge-soft';
			case 'DRAFT':
			default:
				return 'badge-ghost';
		}
	});

	let icon = $derived(getPaperStatusIcon(status));
</script>

<Common {icon} {size} text={translatePaperStatus(status)} {color} />
