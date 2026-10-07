<script lang="ts">
	import DaysUntil from './widgets/DaysUntil.svelte';
	import AppliedChartAndStats from './widgets/AppliedChartAndStats.svelte';
	import AgeChart from './widgets/AgeChart.svelte';
	import Filter from './widgets/Filter.svelte';
	import DistributionChart from './widgets/DistributionChart.svelte';
	import IndividualRoles from './widgets/IndividualRoles.svelte';
	import DietMatrix from './widgets/DietMatrix.svelte';
	import GenderMatrix from './widgets/GenderMatrix.svelte';
	import Maps from './widgets/Maps.svelte';
	import RoleStats from './widgets/RoleStats.svelte';
	import CommitteeFillRates from './widgets/CommitteeFillRates.svelte';
	import RegistrationTimeline from './widgets/RegistrationTimeline.svelte';
	import NationalityChart from './widgets/NationalityChart.svelte';
	import SchoolStats from './widgets/SchoolStats.svelte';
	import WaitingListStats from './widgets/WaitingListStats.svelte';
	import SupervisorStats from './widgets/SupervisorStats.svelte';
	import PostalPaymentProgress from './widgets/PostalPaymentProgress.svelte';
	import PaperStats from './widgets/PaperStats.svelte';
	import HistoryComparison from './widgets/HistoryComparison.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	// Every widget fetches the statistics it renders, with the filter as part of its query, so a
	// filter change refetches them all; `$effect.pending()` reports that refetch.
	const isLoading = $derived($effect.pending() > 0);
</script>

<div class="grid grid-cols-2 gap-3 md:grid-cols-12 relative">
	<!-- Loading overlay -->
	{#if isLoading}
		<div class="absolute inset-0 bg-base-100/50 z-10 flex items-center justify-center rounded-box">
			<span class="loading loading-spinner loading-lg text-primary"></span>
		</div>
	{/if}

	<Filter />
	<DaysUntil conferenceId={params.conferenceId} />

	<AppliedChartAndStats conferenceId={params.conferenceId} />

	<RoleStats conferenceId={params.conferenceId} />

	<SupervisorStats conferenceId={params.conferenceId} />
	<WaitingListStats conferenceId={params.conferenceId} />
	<DistributionChart conferenceId={params.conferenceId} />

	<IndividualRoles conferenceId={params.conferenceId} />

	<PostalPaymentProgress conferenceId={params.conferenceId} />

	<CommitteeFillRates conferenceId={params.conferenceId} />

	<PaperStats conferenceId={params.conferenceId} />

	<RegistrationTimeline conferenceId={params.conferenceId} />

	<AgeChart conferenceId={params.conferenceId} />

	<NationalityChart conferenceId={params.conferenceId} />
	<SchoolStats conferenceId={params.conferenceId} />

	<!-- Row 9: Diet and Gender Matrix -->
	<DietMatrix conferenceId={params.conferenceId} />
	<GenderMatrix conferenceId={params.conferenceId} />

	<!-- Row 10: Map -->
	<Maps conferenceId={params.conferenceId} />

	<!-- Row 11: History Comparison (Full width) -->
	<HistoryComparison conferenceId={params.conferenceId} />
</div>
