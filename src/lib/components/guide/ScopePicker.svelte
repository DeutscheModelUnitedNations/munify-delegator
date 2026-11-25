<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { GuideScopeKind } from '#lib/guide/scope';
	import { scopeLabel } from './guideLabels';

	/**
	 * The four ways to share a page as a 2×2 grid (`docs/plans/guide.md`): every series or this
	 * series, against every year or this year. Shared scopes need the conference to have a series.
	 */
	interface Props {
		value: GuideScopeKind;
		series: string | null;
		year: number;
		disabled?: boolean;
	}

	let { value = $bindable(), series, year, disabled = false }: Props = $props();
	const name = $props.id();

	const cells: { kind: GuideScopeKind; hint: () => string }[] = [
		{ kind: 'EVERYWHERE', hint: () => m.guideScopeEverywhereHint() },
		{ kind: 'YEAR', hint: () => m.guideScopeYearHint() },
		{ kind: 'SERIES', hint: () => m.guideScopeSeriesHint() },
		{ kind: 'CONFERENCE', hint: () => m.guideScopeConferenceHint() }
	];
</script>

<fieldset class="grid grid-cols-[auto_1fr_1fr] gap-2" {disabled}>
	<legend class="fieldset-legend">{m.guideScope()}</legend>
	<span></span>
	<span class="text-center text-xs opacity-70">{m.guideScopeEveryYear()}</span>
	<span class="text-center text-xs opacity-70">{m.guideScopeThisYear({ year })}</span>
	{#each [0, 1] as row (row)}
		<span class="self-center text-xs opacity-70 [writing-mode:vertical-rl] rotate-180">
			{row === 0 ? m.guideScopeEverySeries() : (series ?? m.guideScopeNoSeries())}
		</span>
		{#each [cells[row === 0 ? 0 : 2], cells[row === 0 ? 1 : 3]] as cell (cell.kind)}
			{@const needsSeries = cell.kind !== 'CONFERENCE' && !series}
			<label
				class="rounded-box border-base-300 has-checked:border-primary has-checked:bg-primary/10 flex cursor-pointer flex-col gap-1 border p-3 has-disabled:cursor-not-allowed has-disabled:opacity-50"
			>
				<span class="flex items-center gap-2 font-semibold">
					<input
						type="radio"
						class="radio radio-sm radio-primary"
						{name}
						value={cell.kind}
						bind:group={value}
						disabled={needsSeries}
					/>
					{scopeLabel({ kind: cell.kind, series, year })}
				</span>
				<span class="text-xs opacity-70"
					>{needsSeries ? m.guideScopeNeedsSeriesHint() : cell.hint()}</span
				>
			</label>
		{/each}
	{/each}
</fieldset>
