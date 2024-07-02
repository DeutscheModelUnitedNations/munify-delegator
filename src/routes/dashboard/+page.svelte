<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import ConferenceCard from '$lib/components/ConferenceCard.svelte';

	import LL, { locale } from '$i18n/i18n-svelte';

	const testConferences = [
		{
			id: '1',
			name: 'MUN-SH 2025',
			active: true,
			location: 'Kiel',
			start: new Date(2025, 3, 1),
			end: new Date(2025, 3, 3),
			imageSrc: "/dmun-stock/sh1.jpg"
		},
		{
			id: '2',
			name: 'MUNBW 2025',
			active: true,
			location: 'Stuttgart',
			start: new Date(2025, 4, 1),
			end: new Date(2025, 4, 3),
			imageSrc: "/dmun-stock/bw1.jpg"
		},
		{
			id: '3',
			name: 'MUN-SH 2026',
			active: false,
			location: 'Kiel',
			start: new Date(2026, 3, 1),
			end: new Date(2026, 3, 3),
			imageSrc: "/dmun-stock/sh2.jpg"
		}
	];
</script>

<Header titel="Meine Konferenzen" />
<section class="mt-10 flex flex-wrap gap-4">
	<div class="carousel carousel-center bg-slate-200 shadow-inner rounded-box w-full space-x-6 p-6">
		{#each testConferences as conference}
			<ConferenceCard
				titel={conference.name}
				location={conference.location}
				start={conference.start}
				end={conference.end}
				id={conference.id}
				imageSrc={conference.imageSrc}
			/>
		{/each}
	</div>
</section>
