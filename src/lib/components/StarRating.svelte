<script lang="ts">
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

	const getTextSizeClass: () => string = () => {
		switch (size) {
			case 'xs':
				return 'text-xs';
			case 'sm':
				return 'text-sm';
			case 'md':
				return 'text-base';
			case 'lg':
				return 'text-lg';
			case 'xl':
				return 'text-xl';
		}
	};
</script>

<div class="flex {getTextSizeClass()}">
	{#if rating && changeRating}
		<i
			class="fas fa-times text-md text-base-300 mr-2 cursor-pointer hover:text-red-500"
			onclick={deleteRating}
		></i>
	{/if}
	{#each { length: Math.floor(rating) } as _, i}
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
	{#each { length: Math.floor(5 - rating) } as _, i}
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
