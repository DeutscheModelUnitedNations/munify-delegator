<script lang="ts">
	import StarRating from '$lib/components/StarRating.svelte';
	import {
		getApplications,
		evaluateApplication,
		toggleFlagApplication,
		toggleDisqualifyApplication,
		getMoreInfoLink,
		deleteEvaluation,
		addNote
	} from '../appData.svelte';
	import codenamize from '$lib/helpers/codenamize';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import LoadingData from '../components/LoadingData.svelte';
	import Members from './Members.svelte';
	import formatNames from '$lib/helpers/formatNames';

	interface Props {
		application: ReturnType<typeof getApplications>[number];
		startConference: Date;
	}

	let { application, startConference }: Props = $props();

	const detailFields = { school: true, experience: true, motivation: true } as const;

	/** The id belongs either to a delegation or to a single participant, never to both. */
	async function fetchDetails(applicationId: string, supervisorIds: string[]) {
		const [delegations, singleParticipants, supervisors] = await Promise.all([
			client.query.delegations({
				__args: { where: { id: { eq: applicationId } } },
				...detailFields
			}),
			client.query.singleParticipants({
				__args: { where: { id: { eq: applicationId } } },
				...detailFields
			}),
			client.query.conferenceSupervisors({
				__args: { where: { id: { in: supervisorIds } } },
				user: { id: true, givenName: true, familyName: true }
			})
		]);
		return { details: delegations[0] ?? singleParticipants[0], supervisors };
	}

	type Details = Awaited<ReturnType<typeof fetchDetails>>;

	let applicationDetails = $state<Details['details']>();
	let supervisorDetails = $state<Details['supervisors']>();
	let detailsLoading = $state(false);

	$effect(() => {
		if (!application.id) return;
		const supervisorIds: string[] = [];
		for (const id of application.supervisors?.map((sp) => sp.id) ??
			application.members?.flatMap((m) => m.supervisors?.map((sp) => sp.id)) ??
			[]) {
			if (id) supervisorIds.push(id);
		}

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
</script>

<div
	class="card p-4 shadow-lg {application.disqualified
		? 'border-error border-8'
		: application.flagged && 'border-warning border-8'} transition-all"
>
	<div class="flex items-center justify-between">
		<div class="flex flex-col">
			<h3 class="text-xl font-bold">{codenamize(application.id)}</h3>
			<h5 class="text-sm font-thin">{application.id}</h5>
		</div>
		<div class="flex items-center gap-4">
			<StarRating
				rating={application.evaluation ?? 0}
				changeRating={(rating: number) => evaluateApplication(application.id, rating)}
				deleteRating={() => deleteEvaluation(application.id)}
			/>
			<div class="tooltip" data-tip="Mehr Infos">
				<a
					class="btn btn-square"
					aria-label="More Info"
					href={getMoreInfoLink(application.id)}
					target="_blank"
				>
					<i class="fas fa-info"></i>
				</a>
			</div>
			<div class="tooltip" data-tip="Note">
				<button
					class="btn btn-square"
					aria-label="Note"
					onclick={() => {
						const note = prompt('Notiz:');
						addNote(application.id, note ?? '');
					}}
				>
					<i class="fas fa-sticky-note"></i>
				</button>
			</div>
			<div class="tooltip" data-tip="Highlight">
				<button
					class="btn btn-square {application.flagged && 'btn-warning'}"
					onclick={() => {
						toggleFlagApplication(application.id);
					}}
					aria-label="Flag"
				>
					<i class="fas fa-flag"></i>
				</button>
			</div>
			<div class="tooltip" data-tip="Disqualify">
				<button
					class="btn btn-square {application.disqualified && 'btn-error'}"
					disabled={!!application.splittedInto}
					onclick={() => {
						toggleDisqualifyApplication(application.id);
					}}
					aria-label="Disqualify"
				>
					<i class="fas fa-user-slash"></i>
				</button>
			</div>
		</div>
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
				<tr>
					<td class="text-center"><i class="fa-duotone fa-split text-lg"></i></td>
					<td>
						{#if application.splittedInto}
							Wurde zerteilt in:
							<ul class="ml-6 list-disc">
								{#each application.splittedInto as x}
									<li>{codenamize(x)}</li>
								{/each}
							</ul>
						{/if}
						{#if application.splittedFrom}
							<p>Wurde zerteilt von: {codenamize(application.splittedFrom)}</p>
						{/if}
					</td>
				</tr>
			{/if}
			<Members
				userIds={application.user?.id
					? [application.user.id]
					: (application.members?.map((member) => member.user.id) ?? [])}
				{startConference}
			/>

			{#if supervisorDetails && supervisorDetails.length > 0}
				<tr>
					<td class="text-center"><i class="fa-duotone fa-chalkboard-user text-lg"></i></td>
					<td>
						<LoadingData fetching={detailsLoading} error={!applicationDetails?.school}>
							{supervisorDetails
								.map((x) =>
									formatNames(x.user.givenName ?? undefined, x.user.familyName ?? undefined)
								)
								.join(', ')}
						</LoadingData>
					</td>
				</tr>
			{/if}
			<tr>
				<td class="text-center"><i class="fa-duotone fa-school text-lg"></i></td>
				<td>
					<LoadingData fetching={detailsLoading} error={!applicationDetails?.school}>
						{applicationDetails?.school}
					</LoadingData>
				</td>
			</tr>
			<tr>
				<td class="text-center"><i class="fa-duotone fa-fire-flame-curved text-lg"></i></td>
				<td>
					<LoadingData fetching={detailsLoading} error={!applicationDetails?.motivation}>
						{applicationDetails?.motivation}
						<span class="badge badge-xs">{applicationDetails?.motivation?.length}</span>
					</LoadingData>
				</td>
			</tr>
			<tr>
				<td class="text-center"><i class="fa-duotone fa-compass text-lg"></i></td>
				<td>
					<LoadingData fetching={detailsLoading} error={!applicationDetails?.experience}>
						{applicationDetails?.experience}
						<span class="badge badge-xs">{applicationDetails?.experience?.length}</span>
					</LoadingData>
				</td>
			</tr>
			<tr>
				<td class="text-center"><i class="fa-duotone fa-flag text-lg"></i></td>
				<td>
					<span class="bg-base-300 mr-1 rounded-md px-3 py-[2px]"
						>{application.appliedForRoles.length}</span
					>
					{application.appliedForRoles
						.map((x) => {
							if (x.nation) return getFullTranslatedCountryNameFromISO3Code(x.nation.alpha3Code);
							if (x.nonStateActor) return x.nonStateActor.name;
							if (x.name) return x.name;
							return 'N/A';
						})
						.join(', ')}
				</td>
			</tr>
		</tbody>
	</table>
</div>
