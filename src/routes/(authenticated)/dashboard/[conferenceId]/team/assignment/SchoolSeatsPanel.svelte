<script lang="ts">
	import type { SchoolSeatCount } from './schoolSeats';
	import { m } from '#lib/paraglide/messages';

	/**
	 * How many seats the plan gives each school, against the conference's limit per school. Past
	 * the limit is a warning, never a block.
	 */
	interface Props {
		counts: readonly SchoolSeatCount[];
		/** Seats one school may get; null for no limit. */
		limit: number | null;
		/** How many schools show before "show all". */
		shown?: number;
		/** Lists only the schools close to the limit or past it, for the board beside the pool. */
		nearLimitOnly?: boolean;
		class?: string;
	}

	let { counts, limit, shown = 8, nearLimitOnly = false, class: className = '' }: Props = $props();

	/** From this share of the limit on, a school is close to it. */
	const NEAR_LIMIT = 0.8;

	let expanded = $state(false);
	const exceeds = (count: SchoolSeatCount) => limit !== null && count.seats > limit;
	const over = $derived(counts.filter(exceeds));
	const listed = $derived(
		nearLimitOnly
			? counts.filter((count) => limit !== null && count.seats >= limit * NEAR_LIMIT)
			: counts
	);
	/** The schools shown, each with whether it is past the limit and its seats as shown. */
	const rows = $derived(
		(expanded ? listed : listed.slice(0, shown)).map((count) => ({
			...count,
			exceeded: exceeds(count),
			seatsLabel: limit === null ? String(count.seats) : `${count.seats} / ${limit}`
		}))
	);
</script>

<section
	class="card bg-base-100 border-base-200 border shadow-sm {className}"
	aria-label={m.assignmentSchoolSeatsTitle()}
>
	<div class="card-body gap-2 p-4">
		{@render header()}

		{#if over.length > 0}
			<div class="alert alert-warning alert-soft py-2 text-sm">
				<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation"></i>
				<span>{m.assignmentSchoolSeatsOverLimit({ count: over.length })}</span>
			</div>
		{/if}

		{#if listed.length === 0}
			<p class="text-base-content/60 text-sm">
				{nearLimitOnly && counts.length > 0
					? m.assignmentSchoolSeatsNoneNearLimit()
					: m.assignmentSchoolSeatsEmpty()}
			</p>
		{:else}
			{@render list()}
		{/if}
	</div>
</section>

{#snippet header()}
	<div class="flex items-center justify-between gap-2">
		<h3 class="flex items-center gap-2 font-semibold">
			<i class="fa-sharp-duotone fa-solid fa-school"></i>
			{m.assignmentSchoolSeatsTitle()}
		</h3>
		{#if limit !== null}
			<span class="badge badge-ghost badge-sm" title={m.assignmentSchoolSeatsLimitHint()}>
				{m.assignmentSchoolSeatsLimit({ limit })}
			</span>
		{/if}
	</div>
{/snippet}

{#snippet list()}
	<ul class="flex flex-col gap-1 text-sm">
		{#each rows as row (row.schoolId)}
			<li class="flex items-center justify-between gap-2">
				<span class="truncate" title={row.name}>{row.name}</span>
				{#if row.exceeded}
					<span
						class="badge badge-sm badge-warning shrink-0"
						title={m.assignmentSchoolSeatsExceeded()}
					>
						<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation"></i>
						{row.seatsLabel}
					</span>
				{:else}
					<span class="badge badge-sm badge-ghost shrink-0">{row.seatsLabel}</span>
				{/if}
			</li>
		{/each}
	</ul>
	{#if listed.length > shown}
		<button class="btn btn-ghost btn-xs self-start" onclick={() => (expanded = !expanded)}>
			{expanded
				? m.assignmentSchoolSeatsShowLess()
				: m.assignmentSchoolSeatsShowAll({ count: listed.length })}
		</button>
	{/if}
{/snippet}
