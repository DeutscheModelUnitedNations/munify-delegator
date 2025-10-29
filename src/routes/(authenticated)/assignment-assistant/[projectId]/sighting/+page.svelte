<script lang="ts">
	import TextPreview from '$lib/components/TextPreview.svelte';
	import { getApplications, getConference, loadProjects } from '../appData.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import type { PageProps } from './$types';
	import { onMount } from 'svelte';
	import Application from './Application.svelte';

	let { data }: PageProps = $props();

	const params = queryParameters({
		page: {
			defaultValue: 1,
			encode: (v) => v.toString(),
			decode: (v) => (v ? parseInt(v) : undefined)
		},
		pageSize: {
			defaultValue: 10,
			encode: (v) => v.toString(),
			decode: (v) => (v ? parseInt(v) : undefined)
		}
	});

	let page = $derived($params.page ?? 1);
	let pageSize = $derived($params.pageSize ?? 10);

	let conference = $state(getConference());

	onMount(() => {
		loadProjects(data.projectId);
	});

	const setPage = (newPage: number) => {
		$params.page = newPage;
	};
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
		<Pagination active={page} total={Math.ceil(getApplications().length / pageSize)} {setPage} />
	</div>
	{#each getApplications() as application, index}
		{#if index >= (page - 1) * pageSize && index < page * pageSize}
			<Application {application} startConference={conference?.startConference ?? new Date()} />
		{/if}
	{/each}
	<div class="flex flex-col items-center justify-center gap-4">
		<Pagination active={page} total={Math.ceil(getApplications().length / pageSize)} {setPage} />
		<div class="flex items-center gap-4">
			<div>Pro Seite:</div>
			<select class="select select-bordered" bind:value={$params.pageSize}>
				<option value="10" selected>10</option>
				<option value="20">20</option>
				<option value="50">50</option>
			</select>
		</div>
	</div>
</div>
