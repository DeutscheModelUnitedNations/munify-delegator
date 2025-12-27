<script lang="ts">
	import type { PaperStatus$options } from '$houdini';
	import { getPaperStatusIcon } from '$lib/services/enumIcons';
	import { translatePaperStatus } from '$lib/services/enumTranslations';
	import Common from './Common.svelte';

	interface Props {
		status: PaperStatus$options;
		vertical?: boolean;
	}

	let { status, vertical }: Props = $props();

	let color = $derived.by(() => {
		switch (status) {
			case 'SUBMITTED':
				return 'bg-warning text-warning-content';
			case 'CHANGES_REQUESTED':
				return 'bg-error text-error-content';
			case 'ACCEPTED':
				return 'bg-success text-success-content';
			case 'DRAFT':
			default:
				return 'bg-base-300 text-base-content';
		}
	});

	let icon = $derived(getPaperStatusIcon(status));
</script>

<Common {icon} {vertical} text={translatePaperStatus(status)} classes={color} />
