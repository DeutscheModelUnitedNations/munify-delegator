<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	interface Props {
		currentValue?: number;
		historicValue?: number;
	}

	let { currentValue, historicValue }: Props = $props();

	const getFontClass = () => {
		if (historicValue === undefined || currentValue === undefined) {
			return '';
		}

		if (currentValue > historicValue) {
			return 'text-[#00aa00]';
		}

		if (currentValue < historicValue) {
			return 'text-[#ff0000]';
		}

		return '';
	};

	const getFontAwesomeIcon = () => {
		if (historicValue === undefined || currentValue === undefined) {
			return '';
		}
		if (currentValue > historicValue) {
			return 'fa-arrow-up-right';
		}

		if (currentValue < historicValue) {
			return 'fa-arrow-down-right';
		}

		return 'fa-equals';
	};
</script>

<div class="stat-desc">
	{#if historicValue === undefined || currentValue === undefined}
		<span>–</span>
	{:else}
		<span class={getFontClass()}>
			<i class="fa-solid {getFontAwesomeIcon()}"></i>
			{historicValue}
			{#if currentValue > historicValue}
				(+ {currentValue - historicValue})
			{:else if currentValue < historicValue}
				(- {Math.abs(currentValue - historicValue)})
			{/if}
		</span>
	{/if}
</div>
