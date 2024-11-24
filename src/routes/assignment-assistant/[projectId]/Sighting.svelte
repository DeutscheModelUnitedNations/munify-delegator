<script lang="ts">
	import TextPreview from '$lib/components/TextPreview.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import {
		getApplications,
		evaluateApplication,
		toggleFlagApplication,
		toggleDisqualifyApplication,
		getMoreInfoLink,
		deleteEvaluation,
		addNote
	} from './appData.svelte';
	import codenamize from '$lib/services/codenamize';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import { name } from '$lib/paraglide/messages';
</script>

<TextPreview>
	<h2>Sichtung der Bewerbungen</h2>
	<p>
		Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
		labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
		laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in
		voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat
		non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
	</p>
</TextPreview>

<div class="mt-6 flex flex-col gap-4">
	{#each getApplications() as application}
		<div
			class="card p-4 shadow-lg {application.disqualified
				? 'border-8 border-error'
				: application.flagged && 'border-8 border-warning'} transition-all"
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
							<td class="text-center"><i class="fa-duotone fa-code-branch text-lg"></i></td>
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
					{#if application.user}
						<tr>
							<td class="text-center"><i class="fa-duotone fa-user text-lg"></i></td>
							<td>
								{application.user.given_name}
								{application.user.family_name}
							</td>
						</tr>
					{:else}
						<tr>
							<td class="text-center"><i class="fa-duotone fa-users-viewfinder text-lg"></i></td>
							<td>
								<span class="mr-1 rounded-md bg-base-300 px-3 py-[2px]"
									>{application.members.length}</span
								>
								{application.members
									.sort((x) => {
										if (x.isHeadDelegate) return -1;
										return 1;
									})
									.map((x) => `${x.user.given_name} ${x.user.family_name}`)
									.join(', ')}
							</td>
						</tr>
					{/if}
					{#if application.supervisors?.length > 0}
						<tr>
							<td class="text-center"><i class="fa-duotone fa-chalkboard-user text-lg"></i></td>
							<td>
								<span class="mr-1 rounded-md bg-base-300 px-3 py-[2px]"
									>{application.supervisors.length}</span
								>
								{application.supervisors
									.map((x) => {
										if (x.user) return `${x.user.given_name} ${x.user.family_name}`;
										return 'N/A';
									})
									.join(', ')}
							</td>
						</tr>
					{/if}
					<tr>
						<td class="text-center"><i class="fa-duotone fa-school text-lg"></i></td>
						<td>
							{application.school}
						</td>
					</tr>
					<tr>
						<td class="text-center"><i class="fa-duotone fa-fire-flame-curved text-lg"></i></td>
						<td>
							{application.motivation}
						</td>
					</tr>
					<tr>
						<td class="text-center"><i class="fa-duotone fa-compass text-lg"></i></td>
						<td>
							{application.experience}
						</td>
					</tr>
					<tr>
						<td class="text-center"><i class="fa-duotone fa-flag text-lg"></i></td>
						<td>
							<span class="mr-1 rounded-md bg-base-300 px-3 py-[2px]"
								>{application.appliedForRoles.length}</span
							>
							{application.appliedForRoles
								.map((x) => {
									if (x.nation)
										return getFullTranslatedCountryNameFromISO3Code(x.nation.alpha3Code);
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
	{/each}
</div>
