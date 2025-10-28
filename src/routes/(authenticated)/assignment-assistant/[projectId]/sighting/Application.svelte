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
	import codenamize from '$lib/services/codenamize';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import { graphql } from '$houdini';
	import LoadingData from '../components/LoadingData.svelte';
	import Members from './Members.svelte';

	interface Props {
		application: ReturnType<typeof getApplications>[number];
	}

	let { application }: Props = $props();

	let applicationDetails = $derived.by<
		| {
				school?: string;
				experience?: string;
				motivation?: string;
		  }
		| undefined
	>(() => {
		const delegation = $getApplicationDetailsQuery.data?.findUniqueDelegation;
		const singleParticipant = $getApplicationDetailsQuery.data?.findUniqueSingleParticipant;

		return delegation ?? singleParticipant ?? undefined;
	});

	const getApplicationDetailsQuery = graphql(`
		query GetApplicationDetails($applicationId: String!) {
			findUniqueDelegation(where: { id: $applicationId }) {
				id
				school
				experience
				motivation
			}

			findUniqueSingleParticipant(where: { id: $applicationId }) {
				id
				school
				experience
				motivation
			}
		}
	`);

	$effect(() => {
		if (!application.id) return;
		getApplicationDetailsQuery.fetch({
			variables: {
				applicationId: application.id
			}
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
					: (application.members?.map((member) => member.id) ?? [])}
			/>

			{#if application.supervisors && application.supervisors.length > 0}
				<tr>
					<td class="text-center"><i class="fa-duotone fa-chalkboard-user text-lg"></i></td>
					<td>
						<span class="bg-base-300 mr-1 rounded-md px-3 py-[2px]"
							>{application.supervisors?.length}</span
						>
						<!-- {application.supervisors -->
						<!-- 	.map((x) => { -->
						<!-- 		if (x.user) return formatNames(x.user.given_name, x.user.family_name); -->
						<!-- 		return 'N/A'; -->
						<!-- 	}) -->
						<!-- 	.join(', ')} -->
					</td>
				</tr>
			{/if}
			<tr>
				<td class="text-center"><i class="fa-duotone fa-school text-lg"></i></td>
				<td>
					<LoadingData
						fetching={$getApplicationDetailsQuery.fetching}
						error={!applicationDetails?.school}
					>
						{applicationDetails?.school}
					</LoadingData>
				</td>
			</tr>
			<tr>
				<td class="text-center"><i class="fa-duotone fa-fire-flame-curved text-lg"></i></td>
				<td>
					<LoadingData
						fetching={$getApplicationDetailsQuery.fetching}
						error={!applicationDetails?.motivation}
					>
						{applicationDetails?.motivation}
					</LoadingData>
				</td>
			</tr>
			<tr>
				<td class="text-center"><i class="fa-duotone fa-compass text-lg"></i></td>
				<td>
					<LoadingData
						fetching={$getApplicationDetailsQuery.fetching}
						error={!applicationDetails?.experience}
					>
						{applicationDetails?.experience}
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
