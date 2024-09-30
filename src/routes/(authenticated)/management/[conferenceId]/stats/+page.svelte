<script lang="ts">
	import ChartBar from '$lib/components/Charts/ChartBar.svelte';
	import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import * as m from '$lib/paraglide/messages';
	import { onMount } from 'svelte';
	import AgeChart from './Widgets/AgeChart.svelte';
	let { data } = $props();
</script>

<ManagementHeader title={m.adminStats()} logoutUrl={data.logoutUrl} />

<div class="grid grid-cols-12 mt-10 gap-4">
	<AgeChart ageStats={data.statistics.age} />
</div>
