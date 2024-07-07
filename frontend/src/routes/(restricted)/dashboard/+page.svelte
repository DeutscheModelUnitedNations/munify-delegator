<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import ConferenceCard from '$lib/components/ConferenceCard.svelte';

	import LL, { locale } from '$i18n/i18n-svelte';

	const testConferences = [
		{
			id: '1',
			titel: 'MUN-SH 2025',
			location: 'Kiel',
			website: 'https://www.mun-sh.de',
			start: new Date(2025, 2, 6),
			end: new Date(2025, 2, 10),
			image: '/dmun-stock/sh1.jpg'
		},
		// {
		// 	id: '2',
		// 	titel: 'MUNBW 2025',
		// 	location: 'Stuttgart',
		// 	website: 'https://www.mun-bw.de',
		// 	image: '/dmun-stock/bw1.jpg'
		// },
		// {
		// 	id: '3',
		// 	titel: 'MUN-SH 2026',
		// 	location: 'Kiel',
		// 	website: 'https://www.mun-sh.de',
		// 	image: '/dmun-stock/sh2.jpg'
		// }
	];
</script>

<Header titel="Meine Konferenzen" />
<section class="mt-10 flex flex-wrap gap-4">
	<div class="carousel carousel-center bg-slate-200 shadow-inner rounded-box w-full space-x-6 p-6">
		{#each testConferences as conference}
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
