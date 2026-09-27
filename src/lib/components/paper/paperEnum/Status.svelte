<script lang="ts">
	import type { PaperstatusEnum } from '$lib/api/rumbleClient/client';
	import { getPaperStatusIcon } from '$lib/utils/enumIcons';
	import { translatePaperStatus } from '$lib/utils/enumTranslations';
	import Common from './Common.svelte';

	interface Props {
		status: PaperstatusEnum;
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
