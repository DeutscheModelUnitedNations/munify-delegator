<script lang="ts">
	import { m } from '$lib/paraglide/messages';
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
</script>

<div class="flex {getTextSizeClass()}">
	{#if rating && changeRating}
		<button
			type="button"
			class="text-md text-base-300 mr-2 cursor-pointer hover:text-red-500"
			onclick={deleteRating}
			aria-label={m.delete()}
		>
			<i class="fas fa-times"></i>
		</button>
	{/if}
	{#each { length: Math.floor(rating) }, i}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<i
			class="fa-solid fa-star {getEvaluationColor(rating)}"
			onclick={() => {
				if (!changeRating) return;
				if (rating === i + 1) changeRating(i + 1 - 0.5);
				else changeRating(i + 1);
			}}
		>
		</i>
	{/each}
	{#if rating % 1 === 0.5}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<i
			class="fa-solid fa-star-half-stroke {getEvaluationColor(rating)}"
			onclick={() => {
				if (!changeRating) return;
				changeRating(Math.floor(rating) + 1);
			}}
		></i>
	{/if}
	{#each { length: Math.floor(5 - rating) }, i}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<i
			class="fa-regular fa-star text-gray-500 opacity-30"
			onclick={() => {
				if (!changeRating) return;
				changeRating(rating + i + 1 + (rating % 1 === 0.5 ? 0.5 : 0));
			}}
		></i>
	{/each}
</div>
