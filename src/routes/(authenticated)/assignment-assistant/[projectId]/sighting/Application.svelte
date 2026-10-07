<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getApplications } from '../appData.svelte';
	import codenamize from '$lib/helpers/codenamize';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import { fetchApplicationTexts, fetchSupervisorNames } from '../applicationDetails';
	import LoadingData from '../components/LoadingData.svelte';
	import ApplicationActions from './ApplicationActions.svelte';
	import Members from './Members.svelte';
	import { supervisorIdsOf } from './sightingFilters';
	import formatNames from '$lib/helpers/formatNames';

	interface Props {
		application: ReturnType<typeof getApplications>[number];
		startConference: Date;
	}

	let { application, startConference }: Props = $props();

	async function fetchDetails(applicationId: string, supervisorIds: string[]) {
		const [details, supervisors] = await Promise.all([
			fetchApplicationTexts(applicationId),
			fetchSupervisorNames(supervisorIds)
		]);
		return { details, supervisors };
	}

	type Details = Awaited<ReturnType<typeof fetchDetails>>;

	let applicationDetails = $state<Details['details']>();
	let supervisorDetails = $state<Details['supervisors']>();
	let detailsLoading = $state(false);

	$effect(() => {
		if (!application.id) return;
		const supervisorIds = supervisorIdsOf(application);

		detailsLoading = true;
		void fetchDetails(application.id, supervisorIds)
			.then((result) => {
				applicationDetails = result.details;
				supervisorDetails = result.supervisors;
			})
			.finally(() => {
				detailsLoading = false;
			});
	});

	let borderClass = $derived.by(() => {
		if (application.disqualified) return 'border-error border-8';
		return application.flagged && 'border-warning border-8';
	});

	let memberUserIds = $derived(
		application.user?.id
			? [application.user.id]
			: (application.members?.map((member) => member.user.id) ?? [])
	);

	let appliedForRoleNames = $derived(
		application.appliedForRoles
			.map((x) => {
				if (x.nation) return getFullTranslatedCountryNameFromISO3Code(x.nation.alpha3Code);
				if (x.nonStateActor) return x.nonStateActor.name;
				if (x.name) return x.name;
				return 'N/A';
			})
			.join(', ')
	);
</script>

{#snippet row(icon: string, content: Snippet)}
	<tr>
		<td class="text-center"><i class="fa-duotone fa-{icon} text-lg"></i></td>
		<td>{@render content()}</td>
	</tr>
{/snippet}

<!-- A free text of the application with its length, or an error mark when it is empty. -->
{#snippet textRow(icon: string, text: string | null | undefined)}
	{#snippet content()}
		<LoadingData fetching={detailsLoading} error={!text}>
			{text}
			<span class="badge badge-xs">{text?.length}</span>
		</LoadingData>
	{/snippet}
	{@render row(icon, content)}
{/snippet}

{#snippet splitInfo()}
	{#if application.splittedInto}
		Wurde zerteilt in:
		<ul class="ml-6 list-disc">
			{#each application.splittedInto as x (x)}
				<li>{codenamize(x)}</li>
			{/each}
		</ul>
	{/if}
	{#if application.splittedFrom}
		<p>Wurde zerteilt von: {codenamize(application.splittedFrom)}</p>
	{/if}
{/snippet}

{#snippet supervisorNames()}
	<LoadingData fetching={detailsLoading} error={!applicationDetails?.school}>
		{supervisorDetails
			?.map((x) => formatNames(x.user.givenName ?? undefined, x.user.familyName ?? undefined))
			.join(', ')}
	</LoadingData>
{/snippet}

{#snippet school()}
	<LoadingData fetching={detailsLoading} error={!applicationDetails?.school}>
		{applicationDetails?.school}
	</LoadingData>
{/snippet}

{#snippet appliedForRoles()}
	<span class="bg-base-300 mr-1 rounded-selector px-3 py-[2px]"
		>{application.appliedForRoles.length}</span
	>
	{appliedForRoleNames}
{/snippet}

<div class="card p-4 shadow-lg {borderClass} transition-all">
	<div class="flex items-center justify-between">
		<div class="flex flex-col">
			<h3 class="text-xl font-bold">{codenamize(application.id)}</h3>
			<h5 class="text-sm font-thin">{application.id}</h5>
		</div>
		<ApplicationActions {application} />
	</div>

	{#if application.note}
		<div class="alert alert-info mt-4">
			<i class="fas fa-sticky-note"></i>
			{application.note}
		</div>
	{/if}

	<table class="table">
		<thead>
			<tr>
				<th></th>
				<th class="w-full"></th>
			</tr>
		</thead>
		<tbody>
			{#if application.splittedInto || application.splittedFrom}
				{@render row('split', splitInfo)}
			{/if}
			<Members userIds={memberUserIds} {startConference} />

			{#if supervisorDetails && supervisorDetails.length > 0}
				{@render row('chalkboard-user', supervisorNames)}
			{/if}
			{@render row('school', school)}
			{@render textRow('fire-flame-curved', applicationDetails?.motivation)}
			{@render textRow('compass', applicationDetails?.experience)}
			{@render row('flag', appliedForRoles)}
		</tbody>
	</table>
</div>
