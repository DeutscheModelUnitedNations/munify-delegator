<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import ConferenceCard from '$lib/components/ConferenceCard.svelte';

	const testConferences = [
		{
			id: '1',
			titel: 'MUN-SH 2025',
			location: 'Kiel',
			website: 'https://www.mun-sh.de',
			start: new Date(2025, 2, 6),
			end: new Date(2025, 2, 10),
			image: '/dmun-stock/sh1.jpg',
			active: true
		},
		{
			id: '2',
			titel: 'MUNBW 2025',
			location: 'Stuttgart',
			website: 'https://www.mun-bw.de',
			image: '/dmun-stock/bw1.jpg',
			active: true
		},
		{
			id: '3',
			titel: 'MUN-SH 2024',
			location: 'Kiel',
			website: 'https://www.mun-sh.de',
			image: '/dmun-stock/sh2.jpg',
			active: false
		}
	];
</script>

<Header title="Meine Konferenzen" />
<section class="mt-10 flex flex-wrap gap-4">
	<div class="carousel carousel-center bg-slate-200 shadow-inner rounded-box w-full space-x-6 p-6">
		{#each testConferences.filter((x) => x.active) as conference}
			<ConferenceCard {...conference} btnText="Zur Konferenz" baseSlug="/dashboard" />
		{/each}
		<a href="/registration" class="carousel-item max-w-96 w-[90%]">
			<div
				class="w-full h-full flex flex-col justify-center items-center border border-primary border-dashed rounded-xl hover:bg-base-100 hover:shadow-lg hover:scale-[101%] transition-all duration-300 ease-in-out p-4"
			>
				<i class="fa-duotone fa-plus text-5xl text-primary" />
				<p class="text-primary text-lg mt-4">Zu Konferenz anmelden</p>
			</div>
		</a>
	</div>
</section>

<section class="mt-10">
	<h2 class="text-2xl font-bold">Alle Konferenzen</h2>
	<table class="table overflow-x-auto">
		<thead>
			<tr>
				<th>Titel</th>
				<th>Ort</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each testConferences as conference}
				<tr>
					<td>{conference.titel}</td>
					<td>{conference.location}</td>
					<td class="flex gap-2">
						<a class="btn btn-sm btn-circle" href={conference.website} target="_blank">
							<i class="fa-duotone fa-info"></i>
						</a>
						<a class="btn btn-sm btn-circle" href="/dashboard/{conference.id}">
							<i class="fa-duotone fa-arrow-right"></i>
						</a>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</section>
