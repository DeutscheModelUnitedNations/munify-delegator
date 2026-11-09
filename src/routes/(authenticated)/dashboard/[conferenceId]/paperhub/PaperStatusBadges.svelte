<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { translatePaperStatus } from '#lib/utils/enumTranslations';

	interface Props {
		counts: {
			total: number;
			SUBMITTED: number;
			REVISED: number;
			CHANGES_REQUESTED: number;
			ACCEPTED: number;
		};
		size?: 'default' | 'small';
		blur?: boolean;
	}

	let { counts, size = 'default', blur = false }: Props = $props();

	const chips = $derived([
		{
			tip: translatePaperStatus('SUBMITTED'),
			icon: 'ph-paper-plane-tilt',
			color: 'text-warning',
			count: counts.SUBMITTED
		},
		{
			tip: translatePaperStatus('REVISED'),
			icon: 'ph-arrows-clockwise',
			color: 'text-info',
			count: counts.REVISED
		},
		{
			tip: translatePaperStatus('CHANGES_REQUESTED'),
			icon: 'ph-warning',
			color: 'text-error',
			count: counts.CHANGES_REQUESTED
		},
		{
			tip: translatePaperStatus('ACCEPTED'),
			icon: 'ph-check-circle',
			color: 'text-success',
			count: counts.ACCEPTED
		}
	]);
</script>

<!-- Counts per status; empty ones fade out so the ones with work stand out -->
<div class="flex items-center {size === 'small' ? 'gap-2' : 'gap-3'} tabular-nums">
	<div class="tooltip tooltip-left" data-tip={m.total()}>
		<span
			class="flex items-center gap-1 text-base-content/70 {size === 'small'
				? 'text-xs'
				: 'text-sm'}"
		>
			<i class="ph-duotone ph-file-text"></i>
			<span class:blur-sm={blur} class:select-none={blur}>{counts.total}</span>
		</span>
	</div>
	{#each chips as chip (chip.icon)}
		<div class="tooltip tooltip-left" data-tip={chip.tip}>
			<span
				class="flex items-center gap-1 {chip.color} {size === 'small'
					? 'text-xs'
					: 'text-sm'} {chip.count === 0 ? 'opacity-30' : 'font-semibold'}"
			>
				<i class="ph-duotone {chip.icon}"></i>
				<span class:blur-sm={blur} class:select-none={blur}>{chip.count}</span>
			</span>
		</div>
	{/each}
</div>
