<script lang="ts">
	import UndrawCard from '$lib/components/UndrawCard.svelte';
	import CardInfoSectionWithIcons from '$lib/components/CardInfoSectionWithIcons.svelte';
	import Footer from '$lib/components/Footer.svelte';

	import SHLogo from '$static/logo/mun-sh_logo.png';
	import BWLogo from '$static/logo/munbw_logo.png';

	const munSh = {
		name: 'MUN-SH',
		longName: 'Model United Nations Schleswig-Holstein',
		location: 'Kiel',
		date: 'März / April',
		website: 'https://mun-sh.de',
		logo: SHLogo
	};

	const munBw = {
		name: 'MUNBW',
		longName: 'Model United Nations Baden-Würtemberg',
		location: 'Stuttgart',
		date: 'Mai / Juni',
		website: 'https://munbw.de',
		logo: BWLogo
	};
</script>

<div class="w-full min-h-screen bg-light-blue-500 flex flex-col items-center p-4">
	<hero class="my-20 text-center">
		<h2 class="text-2xl text-base-content font-thin">MUNify</h2>
		<h1 class="text-4xl text-base-content font-bold uppercase tracking-widest">Delegator</h1>
		<p class="text-lg text-base-content mt-4">Zentrale Anmeldeplattform für DMUN-Konferenzen</p>
	</hero>

	<main class="flex flex-col gap-20">
		<section
			class="w-full flex flex-col md:flex-row justify-center items-center md:items-stretch gap-10"
		>
			<UndrawCard
				titel="Anmeldung"
				img="/undraw/team-up.svg"
				btnText="Zur Anmeldung"
				btnLink="/registration"
			>
				<p>Melde dich bei einer unserer Konferenzen an, indem du dich bewirbst</p>
			</UndrawCard>

			<UndrawCard
				titel="Deine Konferenzen"
				img="/undraw/progress.svg"
				btnText="Zur Übersicht"
				btnLink="/dashboard"
			>
				<p>Hier findest du alle Konferenzen, bei denen du schon angemeldet bist</p>
			</UndrawCard>
		</section>
		<section class="flex justify-center items-center">
			<div class="alert alert-warning max-ch-md" role="alert">
				<i class="fas fa-wrench"></i>
				<span>Diese Seite befindet sich noch im Aufbauprozess und hat keinerlei Funktionalität. Sie dient lediglich als konzeptioneller Entwurf.</span>
			</div>
		</section>
		<section class="flex flex-col gap-6 items-center">
			<h2 class="text-3xl text-center">Unsere Konferezen</h2>
			<div class="flex flex-col md:flex-row gap-4">
				<div class="card bg-base-100 shadow-lg">
					<figure class="bg-slate-100 flex justify-center items-center p-6 h-60">
						<img src="/logo/mun-sh_logo.png" alt="Conference" class="h-full" />
					</figure>
					<div class="card-body">
						<h2 class="card-title">{munSh.name}</h2>
						<p class="font-thin font-xs">{munSh.longName}</p>
						<CardInfoSectionWithIcons
							items={[
								{ icon: 'fa-location-dot', text: munSh.location },
								{ icon: 'fa-calendar', text: munSh.date },
								{ icon: 'fa-globe', text: munSh.website, link: munSh.website }
							]}
						/>
					</div>
				</div>
				<div class="card bg-base-100 shadow-lg">
					<figure class="bg-slate-100 flex justify-center items-center p-6 h-60">
						<img src="/logo/munbw_logo.png" alt="Conference" class="h-full" />
					</figure>
					<div class="card-body">
						<h2 class="card-title">{munBw.name}</h2>
						<p class="font-thin font-xs">{munBw.longName}</p>
						<CardInfoSectionWithIcons
							items={[
								{ icon: 'fa-location-dot', text: munBw.location },
								{ icon: 'fa-calendar', text: munBw.date },
								{ icon: 'fa-globe', text: munBw.website, link: munBw.website }
							]}
						/>
					</div>
				</div>
			</div>
		</section>
		<section class="w-full flex flex-col gap-6 max-w-[800px] text-center">
			<h2 class="text-3xl">Über uns</h2>
			<p>
				DMUN ist ein gemeinnütziger Verein von jungen Erwachsenen, die sich für internationale
				Politik und die Vereinten Nationen begeistern. Wir sind bundesweit und auf internationaler
				Ebene im Bereich der politischen Jugendbildung und des Youth Empowerments tätig. 2003
				gegründet, und seit 2012 als Nichtregierungsorganisation mit speziellem Beraterstatus beim
				Wirtschafts- und Sozialrat der Vereinten Nationen sowie beim UNDPI akkreditiert,
				veranstalten wir politische Planspiele, bei denen Jugendliche und junge Erwachsene zwischen
				15 und 21 Jahren eine Konferenz der Vereinten Nationen simulieren. Außerdem setzen wir uns
				auf internationaler Ebene für politische Jugendbildung und die Partizipation junger Menschen
				an politischen Prozessen ein.
			</p>
		</section>
	</main>
	<Footer />
</div>
