<script lang="ts">
	import fetchWBStat from '$lib/helper/fetchWBStat';
	import { onMount } from 'svelte';

	interface Props {
		countryCode: string;
		icon: string;
		title: string;
		desc?: string;
		wbIndicator: string;
		formatter?: (value: number) => string;
	}

	let { countryCode, icon, title, desc, wbIndicator, formatter }: Props = $props();

	let value = $state<string>();

	onMount(() => {
		fetchWBStat(countryCode, wbIndicator).then((data) => {
			if (!data) {
				value = '–';
			} else {
				const formattedValue = formatter ? formatter(data) : data.toLocaleString();
				value = formattedValue;
			}
		});
	});
</script>

<div class="stats bg-base-200 shadow">
	<div class="stat">
		<div class="stat-figure text-primary">
			<i class="fa-duotone fa-{icon} text-3xl"></i>
		</div>
		<div class="stat-title">{title}</div>
		{#if value}
			<div class="stat-value">{value}</div>
		{:else}
			<div class="stat-value skeleton my-1 h-8 w-20"></div>
		{/if}
		{#if desc}
			<div class="stat-desc">{desc}</div>
		{/if}
	</div>
</div>
