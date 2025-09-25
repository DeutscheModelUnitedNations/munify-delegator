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
	import Pagination from '$lib/components/Pagination.svelte';
	import formatNames from '$lib/services/formatNames';

	let page = 1;
	let pageSize = 10;
</script>

<TextPreview>
	<h2>Sichtung der Bewerbungen</h2>
	<p>
		Dieses Tool ermöglicht eine algorithmische und optimierte Sichtung und Zuteilung der Bewerbungen
		für die Konferenz.
	</p>
	<p>
		Es ist darauf ausgelegt, zuerst die Bewerbungen zu sichten, um ggf. Ausschlüsse, Bewertungen,
		Notizen und Markierungen zu setzen. Da die Zuteilung automatisiert auf Grundlage der Bewertungen
		und Markierungen erfolgt, ist es essenziell, dass die Sichtung sorgfältig und gewissenhaft
		durchgeführt wird. So spart man sich im weiteren Verlauf der Zuteilung Zeit und Aufwand.
	</p>
	<p>Folgende Funktionen stehen zur Verfügung:</p>
	<ul class="list-disc">
		<li>
			<strong>Bewertung:</strong> Die Bewerbungen können mit einer Bewertung versehen werden, um die
			Zuteilung zu optimieren. Eine bessere Bewertung erhöht die Wahrscheinlichkeit, dass die Bewerbung
			eine Wunschrolle erhält. Eine schlechtere Bewertung verringert die Wahrscheinlichkeit und kann
			sogar bei Engpässen zu einer einstweiligen Ablehnung führen. Eine "Grundbewertung" kann festgelegt
			werden, um die Bewertung zu standardisieren – sie liegt standartmäßig bei 2,5 Sternen.
		</li>
		<li>
			<strong>Notizen:</strong> Zu jeder Bewerbung kann eine Notiz hinzugefügt werden, um besondere Umstände
			oder Informationen festzuhalten.
		</li>
		<li>
			<strong>Markierungen:</strong> Bewerbungen können markiert werden, um sie hervorzuheben. Dies kann
			zum Beispiel bei Bewerbungen mit besonderen Umständen oder besonderen Qualifikationen hilfreich
			sein. Es ist auch möglich, jeder Bewertung noch einen Bonus/Malus hinzuzufügen, um die Zuteilung
			für markierte Delegationen zu beeinflussen.
		</li>
		<li>
			<strong>Ausschluss:</strong> Bewerbungen können ausgeschlossen werden, wenn sie nicht den Anforderungen
			entsprechen oder unvollständig sind. Diese Bewerbungen tauchen dann im folgenden Verfahren gar
			nicht mehr auf.
		</li>
	</ul>
	<p>
		Zu jedem Zeitpunkt kann der Stand der Zuteilung als JSON-Datei exportiert und damit sicher
		gespeichert bzw. auch verschickt werden. Es ist wichtig, regelmäßig zu speichern – nicht zuletzt
		um auch eine Möglichkeit zu haben, auf einen früheren Stand zurückzukehren. Viele Aktionen
		können zwar wieder umgekehrt werden, aber ein generelles zurücksetzen von Aktionen wie "Str+Z"
		ist nicht möglich.
	</p>
</TextPreview>

<div class="mt-6 flex flex-col gap-4">
	<div class="flex items-center justify-center">
		<Pagination
			active={page}
			total={Math.ceil(getApplications().length / pageSize)}
			setPage={(newPage) => (page = newPage)}
		/>
	</div>
	{#each getApplications() as application, index}
		{#if index >= (page - 1) * pageSize && index < page * pageSize}
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
									<span class="bg-base-300 mr-1 rounded-md px-3 py-[2px]"
										>{application.members.length}</span
									>
									{application.members
										.sort((x) => {
											if (x.isHeadDelegate) return -1;
											return 1;
										})
										.map((x) => formatNames(x.user.given_name, x.user.family_name))
										.join(', ')}
								</td>
							</tr>
						{/if}
						{#if application.supervisors && application.supervisors.length > 0}
							<tr>
								<td class="text-center"><i class="fa-duotone fa-chalkboard-user text-lg"></i></td>
								<td>
									<span class="bg-base-300 mr-1 rounded-md px-3 py-[2px]"
										>{application.supervisors?.length}</span
									>
									{application.supervisors
										.map((x) => {
											if (x.user) return formatNames(x.user.given_name, x.user.family_name);
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
								<span class="bg-base-300 mr-1 rounded-md px-3 py-[2px]"
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
		{/if}
	{/each}
	<div class="flex flex-col items-center justify-center gap-4">
		<Pagination
			active={page}
			total={Math.ceil(getApplications().length / pageSize)}
			setPage={(newPage) => (page = newPage)}
		/>
		<div class="flex items-center gap-4">
			<div>Pro Seite:</div>
			<select class="select select-bordered" bind:value={pageSize}>
				<option value="10" selected>10</option>
				<option value="25">20</option>
				<option value="50">50</option>
			</select>
		</div>
	</div>
</div>
