<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { translatePaperStatus } from '$lib/services/enumTranslations';

	interface Props {
		counts: {
			total: number;
			SUBMITTED: number;
			CHANGES_REQUESTED: number;
			ACCEPTED: number;
		};
		size?: 'default' | 'small';
	}

	let { counts, size = 'default' }: Props = $props();

	let badgeSizeClass = $derived(size === 'small' ? 'badge-sm' : '');
</script>

<div class="flex items-center gap-{size === 'small' ? '1' : '2'}">
	<div class="badge badge-ghost {badgeSizeClass} gap-1" title={m.total()}>
		<i class="fa-solid fa-file-lines text-xs"></i>
		{counts.total}
	</div>
	<div
		class="badge badge-warning badge-outline {badgeSizeClass} gap-1"
		title={translatePaperStatus('SUBMITTED')}
	>
		<i class="fa-solid fa-paper-plane text-xs"></i>
		{counts.SUBMITTED}
	</div>
	<div
		class="badge badge-error badge-outline {badgeSizeClass} gap-1"
		title={translatePaperStatus('CHANGES_REQUESTED')}
	>
		<i class="fa-solid fa-exclamation-triangle text-xs"></i>
		{counts.CHANGES_REQUESTED}
	</div>
	<div
		class="badge badge-success badge-outline {badgeSizeClass} gap-1"
		title={translatePaperStatus('ACCEPTED')}
	>
		<i class="fa-solid fa-check-circle text-xs"></i>
		{counts.ACCEPTED}
	</div>
</div>
