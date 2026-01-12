<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { GaugeChart, StackedBarChart, BarChart } from '$lib/components/Charts/ECharts';
	import type { PostalPaymentProgress } from '../stats.svelte';

	interface Props {
		progress: PostalPaymentProgress;
	}

	let { progress }: Props = $props();

	// Postal status breakdown
	const postalData = $derived([
		{
			name: m.statusDone(),
			value: progress.postalDone,
			color: '#22c55e'
		},
		{
			name: m.statusPending(),
			value: progress.postalPending,
			color: '#f59e0b'
		},
		{
			name: m.statusProblem(),
			value: progress.postalProblem,
			color: '#ef4444'
		}
	]);

	// Payment status breakdown
	const paymentData = $derived([
		{
			name: m.statusDone(),
			value: progress.paymentDone,
			color: '#22c55e'
		},
		{
			name: m.statusPending(),
			value: progress.paymentPending,
			color: '#f59e0b'
		},
		{
			name: m.statusProblem(),
			value: progress.paymentProblem,
			color: '#ef4444'
		}
	]);

	// Completion matrix data
	const completionLabels = $derived([
		m.statsNeitherComplete(),
		m.statsPostalOnlyComplete(),
		m.statsPaymentOnlyComplete(),
		m.statsBothComplete()
	]);

	const completionValues = $derived([
		progress.neitherComplete,
		progress.postalOnlyComplete,
		progress.paymentOnlyComplete,
		progress.bothComplete
	]);
</script>

<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12 xl:col-span-6">
	<div class="card-body p-4">
		<h2 class="card-title text-base font-semibold">
			<i class="fa-duotone fa-clipboard-check text-base-content/70"></i>
			{m.statsPostalPaymentProgress()}
		</h2>

		<p class="text-sm text-base-content/70">
			{m.statsProgressDescription({ max: progress.maxParticipants })}
		</p>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Postal Progress -->
			<div class="rounded-lg bg-base-100 p-4">
				<h3 class="mb-2 text-center text-sm font-medium">
					<i class="fa-duotone fa-envelope mr-1"></i>
					{m.postalRegistration()}
				</h3>
				<GaugeChart
					value={progress.postalPercentage}
					name={m.statusDone()}
					height="150px"
					color="#22c55e"
				/>
				<div class="mt-2">
					<StackedBarChart
						data={postalData}
						height="30px"
						showLabels={true}
						showPercentage={true}
					/>
				</div>
				<div class="mt-2 flex justify-center gap-4 text-xs">
					<span class="flex items-center gap-1">
						<span class="inline-block h-2 w-2 rounded-full bg-success"></span>
						{progress.postalDone}
					</span>
					<span class="flex items-center gap-1">
						<span class="inline-block h-2 w-2 rounded-full bg-warning"></span>
						{progress.postalPending}
					</span>
					<span class="flex items-center gap-1">
						<span class="inline-block h-2 w-2 rounded-full bg-error"></span>
						{progress.postalProblem}
					</span>
				</div>
			</div>

			<!-- Payment Progress -->
			<div class="rounded-lg bg-base-100 p-4">
				<h3 class="mb-2 text-center text-sm font-medium">
					<i class="fa-duotone fa-credit-card mr-1"></i>
					{m.payment()}
				</h3>
				<GaugeChart
					value={progress.paymentPercentage}
					name={m.statusDone()}
					height="150px"
					color="#22c55e"
				/>
				<div class="mt-2">
					<StackedBarChart
						data={paymentData}
						height="30px"
						showLabels={true}
						showPercentage={true}
					/>
				</div>
				<div class="mt-2 flex justify-center gap-4 text-xs">
					<span class="flex items-center gap-1">
						<span class="inline-block h-2 w-2 rounded-full bg-success"></span>
						{progress.paymentDone}
					</span>
					<span class="flex items-center gap-1">
						<span class="inline-block h-2 w-2 rounded-full bg-warning"></span>
						{progress.paymentPending}
					</span>
					<span class="flex items-center gap-1">
						<span class="inline-block h-2 w-2 rounded-full bg-error"></span>
						{progress.paymentProblem}
					</span>
				</div>
			</div>
		</div>

		<!-- Completion Matrix -->
		<div class="mt-4 rounded-lg bg-base-100 p-4">
			<h3 class="mb-2 text-center text-sm font-medium">
				<i class="fa-duotone fa-grid-2 mr-1"></i>
				{m.statsCompletionMatrix()}
			</h3>
			<BarChart
				labels={completionLabels}
				values={completionValues}
				height="200px"
				yAxisName={m.statsParticipants()}
			/>
		</div>
	</div>
</section>
