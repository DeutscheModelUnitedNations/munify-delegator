<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { starTarget } from './starRating';
	interface Props {
		rating: number;
		changeRating?: (rating: number) => void;
		deleteRating?: () => void;
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
	}

	let { rating, changeRating, deleteRating, size = 'xl' }: Props = $props();

	const getEvaluationColor: (evaluation: number) => string = (evaluation) => {
		if (evaluation < 1.5) return 'text-red-500';
		if (evaluation < 2.5) return 'text-orange-500';
		if (evaluation < 4.5) return 'text-gray-500';
		return 'text-green-500';
	};

	const textSizeClasses: Record<NonNullable<Props['size']>, string> = {
		xs: 'text-xs',
		sm: 'text-sm',
		md: 'text-base',
		lg: 'text-lg',
		xl: 'text-xl'
	};

	const getTextSizeClass = () => textSizeClasses[size];

	const positions = [1, 2, 3, 4, 5];
	const stars = (value: number) => value.toLocaleString(getLocale());

	/** The icon a position shows: full up to the rating, a half star after it, empty beyond */
	const iconOf = (position: number) =>
		position <= rating
			? `ph-star ${getEvaluationColor(rating)}`
			: position - 0.5 === rating
				? `ph-star-half ${getEvaluationColor(rating)}`
				: 'ph-star text-gray-500 opacity-30';
</script>

{#snippet star(position: number)}
	<i aria-hidden="true" class="ph-duotone {iconOf(position)}"></i>
{/snippet}

<div class="flex {getTextSizeClass()}">
	{#if changeRating}
		{#if rating}
			<button
				type="button"
				class="text-md text-base-300 mr-2 cursor-pointer hover:text-red-500"
				onclick={deleteRating}
				aria-label={m.delete()}
			>
				<i aria-hidden="true" class="ph-fill ph-x"></i>
			</button>
		{/if}
		<!-- Each star is a button saying what it would set; the group says what is set now -->
		<div role="group" class="flex" aria-label={m.a11yRatingValue({ stars: stars(rating) })}>
			{#each positions as position (position)}
				{@const target = starTarget({ rating, position })}
				<button
					type="button"
					class="cursor-pointer"
					aria-label={m.a11yRateWithStars({ stars: stars(target) })}
					onclick={() => changeRating(target)}
				>
					{@render star(position)}
				</button>
			{/each}
		</div>
	{:else}
		<span role="img" class="flex" aria-label={m.a11yRatingValue({ stars: stars(rating) })}>
			{#each positions as position (position)}
				{@render star(position)}
			{/each}
		</span>
	{/if}
</div>
