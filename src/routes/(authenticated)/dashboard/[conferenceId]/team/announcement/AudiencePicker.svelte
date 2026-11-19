<!--
	@component
	Picks who an announcement is for: any number of blocks, and whoever is in one of them reads it.
	One search adds blocks; one that a picked block already holds cannot be added, and adding a
	wider one drops the narrower ones it takes in. Below it says how many people that is right now.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import {
		addAudience,
		audienceKey,
		coveringAudience,
		type Audience
	} from '#lib/helpers/announcements';
	import AudienceCount from './AudienceCount.svelte';
	import AudienceSearch from './AudienceSearch.svelte';
	import { audienceLabel, type AudienceLookups } from './announcementLabels';
	import { audienceSections, SUGGESTED_AUDIENCES } from './audienceOptions';

	interface Props {
		conferenceId: string;
		audiences: Audience[];
		lookups: AudienceLookups;
	}

	let { conferenceId, audiences = $bindable(), lookups }: Props = $props();

	const label = (audience: Audience) => audienceLabel({ audience, lookups });
	const sections = $derived(audienceSections({ lookups, picked: audiences }));
	/** What the last addition took out, said once below the chips. */
	let merged = $state<string>();

	function add(audience: Audience) {
		const next = addAudience({ audience, audiences });
		audiences = next.audiences;
		merged =
			next.removed.length > 0
				? m.announcementAudienceMerged({
						audience: label(audience),
						removed: next.removed.map(label).join(', ')
					})
				: undefined;
	}

	function remove(audience: Audience) {
		audiences = audiences.filter((other) => audienceKey(other) !== audienceKey(audience));
		merged = undefined;
	}

	function removeAll() {
		audiences = [];
		merged = undefined;
	}

	/** A block saved before another one took it in (only older announcements have these). */
	const coveredBy = (audience: Audience) => {
		const covering = coveringAudience({ audience, audiences });
		return covering ? m.announcementAudienceCoveredBy({ audience: label(covering) }) : undefined;
	};

	/** The usual blocks not picked yet, each saying whether a picked one already holds it. */
	const suggestions = $derived(
		SUGGESTED_AUDIENCES.filter(
			(audience) => !audiences.some((other) => audienceKey(other) === audienceKey(audience))
		).map((audience) => ({
			key: audienceKey(audience),
			audience,
			label: label(audience),
			coveredBy: coveredBy(audience)
		}))
	);
</script>

<div class="flex flex-col gap-3" data-testid="audience-picker">
	<AudienceSearch
		{sections}
		onPick={add}
		onRemove={remove}
		onRemoveLast={() => {
			const last = audiences.at(-1);
			if (last) remove(last);
		}}
	/>

	{@render picked()}

	{@render suggested()}

	<!-- always there, so screen readers hear when a line appears -->
	<div aria-live="polite">
		{#if merged}
			<p class="text-base-content/60 flex items-start gap-1.5 text-xs">
				<i aria-hidden="true" class="ph-duotone ph-arrows-in-simple mt-0.5"></i>
				{merged}
			</p>
		{/if}
	</div>

	<div class="border-base-content/10 flex flex-col gap-1.5 border-t pt-3">
		{#if audiences.length > 0}
			<AudienceCount {conferenceId} {audiences} />
		{/if}
		<p class="text-base-content/50 text-xs leading-relaxed">{m.announcementAudienceHint()}</p>
	</div>
</div>

{#snippet picked()}
	{#if audiences.length > 0}
		<ul class="flex flex-wrap items-center gap-1.5" aria-label={m.announcementAudience()}>
			{#each audiences as audience (audienceKey(audience))}
				{@const covered = coveredBy(audience)}
				<li
					class={['badge badge-soft gap-1 py-3 pr-1', covered ? 'badge-ghost' : 'badge-primary']}
					title={covered}
				>
					{label(audience)}
					{#if covered}<span class="sr-only">({covered})</span>{/if}
					<button
						type="button"
						class="hover:bg-primary/20 rounded-field flex size-5 cursor-pointer items-center justify-center"
						aria-label={m.announcementAudienceRemove({ audience: label(audience) })}
						onclick={() => remove(audience)}
					>
						<i aria-hidden="true" class="ph-duotone ph-x"></i>
					</button>
				</li>
			{/each}
			{#if audiences.length > 1}
				<li>
					<button
						type="button"
						class="btn btn-ghost btn-xs text-base-content/60"
						onclick={removeAll}
						data-testid="audience-clear"
					>
						<i aria-hidden="true" class="ph-duotone ph-x-circle"></i>
						{m.announcementAudienceClear()}
					</button>
				</li>
			{/if}
		</ul>
	{:else}
		<p class="text-base-content/60 flex items-center gap-1.5 text-xs">
			<i aria-hidden="true" class="ph-duotone ph-info text-sm"></i>
			{m.announcementAudienceRequired()}
		</p>
	{/if}
{/snippet}

{#snippet suggested()}
	{#if suggestions.length > 0}
		<!-- one click for the usual cases; everything else through the search -->
		<div class="flex flex-wrap items-center gap-1.5">
			<span class="text-base-content/60 text-xs">{m.announcementAudienceSuggestions()}</span>
			{#each suggestions as suggestion (suggestion.key)}
				<button
					type="button"
					class="btn btn-xs btn-ghost border-base-content/15 border-dashed"
					disabled={!!suggestion.coveredBy}
					title={suggestion.coveredBy}
					onclick={() => add(suggestion.audience)}
					data-testid="audience-suggestion"
				>
					<i aria-hidden="true" class="ph-duotone ph-plus"></i>
					{suggestion.label}
					{#if suggestion.coveredBy}<span class="sr-only">({suggestion.coveredBy})</span>{/if}
				</button>
			{/each}
		</div>
	{/if}
{/snippet}
