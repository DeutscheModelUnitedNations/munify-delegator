<!--
	@component
	The paper hub card's numbers, drawn from plain props: how many papers wait for a first look, a
	stacked bar of where the submitted papers stand, and how many reviews the caller has given.
	Kept apart from the fetching in `PaperHubLinkInfo` so this markup holds no async expression:
	a nested `{#if}` on an awaited value inside another one broke hydration ("Cannot add children
	to a Comment").
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	interface Props {
		awaiting: number;
		changes: number;
		approved: number;
		/** Reviews the caller has given; undefined for anyone who is not a reviewer */
		reviews?: number;
	}

	let { awaiting, changes, approved, reviews }: Props = $props();

	const total = $derived(awaiting + changes + approved);

	const segments = $derived(
		[
			{ key: 'awaiting', count: awaiting, class: 'bg-warning', label: m.awaitingReview() },
			{
				key: 'changes',
				count: changes,
				class: 'bg-error',
				label: m.paperStatusChangesRequested()
			},
			{ key: 'accepted', count: approved, class: 'bg-success', label: m.paperStatusAccepted() }
		].filter((segment) => segment.count > 0)
	);
</script>

{#if total > 0}
	<div class="mt-2 flex flex-col gap-2">
		<div class="flex items-baseline gap-2">
			<span class="text-3xl leading-none font-semibold tabular-nums">{awaiting}</span>
			<span class="text-base-content/70 text-sm">{m.awaitingReview()}</span>
			{#if reviews !== undefined}
				<span class="text-base-content/60 ml-auto flex items-center gap-1.5 text-xs">
					<i class="fa-sharp-duotone fa-solid fa-star text-primary" aria-hidden="true"></i>
					{m.yourReviewStats()}: <span class="font-semibold">{reviews}</span>
				</span>
			{/if}
		</div>

		<div class="flex h-2 w-full overflow-hidden rounded-full" aria-hidden="true">
			{#each segments as segment (segment.key)}
				<div class={segment.class} style="width: {(segment.count / total) * 100}%"></div>
			{/each}
		</div>

		<ul class="text-base-content/70 flex flex-wrap gap-x-4 gap-y-1 text-xs">
			{#each segments as segment (segment.key)}
				<li class="flex items-center gap-1.5">
					<span class="inline-block size-2 rounded-full {segment.class}" aria-hidden="true"></span>
					{segment.label}
					<span class="font-semibold tabular-nums">{segment.count}</span>
				</li>
			{/each}
		</ul>
	</div>
{/if}
