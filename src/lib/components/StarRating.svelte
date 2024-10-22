<script lang="ts">
	interface Props {
		rating: number;
		changeRating: (rating: number) => void;
	}

	let { rating, changeRating }: Props = $props();

	const getEvaluationColor: (evaluation: number) => string = (evaluation) => {
		if (evaluation < 1.5) return 'text-red-500';
		if (evaluation < 2.5) return 'text-orange-500';
		if (evaluation < 4.5) return 'text-gray-500';
		return 'text-green-500';
	};
</script>

<div class="flex text-xl">
	{#each { length: Math.floor(rating) } as _, i}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<i
			class="fa-solid fa-star {getEvaluationColor(rating)}"
			onclick={() => {
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
			onclick={() => changeRating(Math.floor(rating) + 1)}
		></i>
	{/if}
	{#each { length: Math.floor(5 - rating) } as _, i}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<i
			class="fa-regular fa-star text-gray-300"
			onclick={() => {
				changeRating(rating + i + 1 + (rating % 1 === 0.5 ? 0.5 : 0));
			}}
		></i>
	{/each}
</div>
