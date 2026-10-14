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

	/** Badge classes per status; drafts and anything unlisted get the ghost badge. */
	const statusColors: Partial<Record<PaperstatusEnum, string>> = {
		SUBMITTED: 'badge-warning badge-soft',
		REVISED: 'badge-info badge-soft',
		CHANGES_REQUESTED: 'badge-error badge-soft',
		ACCEPTED: 'badge-success badge-soft'
	};

	let color = $derived(statusColors[status] ?? 'badge-ghost');

	let icon = $derived(getPaperStatusIcon(status));
</script>

<Common {icon} {size} text={translatePaperStatus(status)} {color} />
