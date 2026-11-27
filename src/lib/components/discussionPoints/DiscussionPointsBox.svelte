<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/**
	 * An agenda item's points for discussion as the box that stands out: a warning-toned frame with
	 * a strong stripe, its icon and a numbered list in the body text colour (readable at 4.5:1).
	 * The guide, the paper forms and the paper page show the same box. Nothing without points.
	 */
	interface Props {
		points: readonly string[];
		/** The heading; "Punkte zur Diskussion" in the reader's language by default. */
		heading?: string;
		/** The heading's anchor, for the guide's table of contents. */
		anchor?: string;
		/** Smaller, for the narrow column of the paper forms. */
		compact?: boolean;
	}

	let { points, heading, anchor, compact = false }: Props = $props();
	const generatedId = $props.id();
	const headingId = $derived(anchor ?? generatedId);

	const SIZES = {
		regular: { box: 'p-5', title: 'text-xl', badge: 'size-9', icon: 'text-xl', list: '' },
		compact: { box: 'p-3', title: 'text-base', badge: 'size-7', icon: 'text-lg', list: 'text-sm' }
	};
	const size = $derived(compact ? SIZES.compact : SIZES.regular);
</script>

{#if points.length > 0}
	<section
		class="border-warning rounded-box border border-s-8 bg-[color-mix(in_oklab,var(--color-warning)_12%,var(--color-base-100))] shadow-sm {size.box}"
		aria-labelledby={headingId}
		data-testid="discussion-points"
	>
		<h2
			id={headingId}
			class="text-base-content flex scroll-mt-24 items-center gap-2 font-bold {size.title}"
		>
			<span
				class="bg-warning text-warning-content grid shrink-0 place-items-center rounded-full {size.badge}"
				aria-hidden="true"
			>
				<i class="ph-fill ph-chats-circle {size.icon}" aria-hidden="true"></i>
			</span>
			{heading ?? m.discussionPoints()}
		</h2>
		<ol
			class="text-base-content mt-3 flex list-decimal flex-col gap-1.5 ps-6 marker:font-bold {size.list}"
		>
			{#each points as point, index (index)}
				<li class="ps-1">{point}</li>
			{/each}
		</ol>
	</section>
{/if}
