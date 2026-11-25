<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import ScopePicker from '#lib/components/guide/ScopePicker.svelte';
	import type { GuideScopeKind } from '#lib/guide/scope';

	/** Where a general page is shared; committee and agenda item pages stay in their conference. */
	interface Props {
		kind: 'GENERAL' | 'COMMITTEE' | 'AGENDA_ITEM';
		scope: GuideScopeKind;
		series: string | null;
		year: number;
		onApply: (scope: GuideScopeKind) => void;
	}

	let { kind, scope, series, year, onApply }: Props = $props();

	// follows the stored scope, until the picker changes it
	let picked = $derived<GuideScopeKind>(scope);
</script>

{#if kind === 'GENERAL'}
	<details class="collapse-arrow bg-base-200 rounded-box collapse" data-tour="team.guidePage.scope">
		<summary class="collapse-title font-semibold">{m.guideScope()}</summary>
		<div class="collapse-content">
			<ScopePicker bind:value={picked} {series} {year} />
			<button
				class="btn btn-sm btn-primary mt-3"
				disabled={picked === scope}
				onclick={() => onApply(picked)}
			>
				{m.guideScopeApply()}
			</button>
		</div>
	</details>
{:else}
	<p class="text-sm opacity-70" data-tour="team.guidePage.scope">{m.guideOwnedPageHint()}</p>
{/if}
