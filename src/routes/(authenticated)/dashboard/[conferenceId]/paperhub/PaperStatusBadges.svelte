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
		blur?: boolean;
	}

	let { counts, size = 'default', blur = false }: Props = $props();

	let badgeSizeClass = $derived(size === 'small' ? 'badge-sm' : '');
</script>

<div class="flex items-center gap-{size === 'small' ? '1' : '2'}">
	<div class="tooltip tooltip-left" data-tip={m.total()}>
		<div class="badge badge-ghost {badgeSizeClass} gap-1">
			<i class="fa-solid fa-file-lines text-xs"></i>
			<span class:blur-sm={blur} class:select-none={blur}>{counts.total}</span>
		</div>
	</div>
	<div class="tooltip tooltip-left tooltip-warning" data-tip={translatePaperStatus('SUBMITTED')}>
		<div class="badge badge-warning badge-outline {badgeSizeClass} gap-1">
			<i class="fa-solid fa-paper-plane text-xs"></i>
			<span class:blur-sm={blur} class:select-none={blur}>{counts.SUBMITTED}</span>
		</div>
	</div>
	<div
		class="tooltip tooltip-left tooltip-error"
		data-tip={translatePaperStatus('CHANGES_REQUESTED')}
	>
		<div class="badge badge-error badge-outline {badgeSizeClass} gap-1">
			<i class="fa-solid fa-exclamation-triangle text-xs"></i>
			<span class:blur-sm={blur} class:select-none={blur}>{counts.CHANGES_REQUESTED}</span>
		</div>
	</div>
	<div class="tooltip tooltip-left tooltip-success" data-tip={translatePaperStatus('ACCEPTED')}>
		<div class="badge badge-success badge-outline {badgeSizeClass} gap-1">
			<i class="fa-solid fa-check-circle text-xs"></i>
			<span class:blur-sm={blur} class:select-none={blur}>{counts.ACCEPTED}</span>
		</div>
	</div>
</div>
