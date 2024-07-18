<script lang="ts">
	import UndrawCard from '$lib/components/UndrawCard.svelte';
	import CardInfoSectionWithIcons from '$lib/components/CardInfoSectionWithIcons.svelte';
	import Footer from '$lib/components/Footer.svelte';

	import * as m from '$lib/paraglide/messages.js';

	import SHLogo from '$assets/logo/mun-sh_logo.png';
	import BWLogo from '$assets/logo/munbw_logo.png';
	import UdteamUp from '$assets/undraw/team-up.svg';
	import UdProgress from '$assets/undraw/progress.svg';
	import MermaidWrapper from '$lib/components/MermaidWrapper.svelte';

	const munSh = {
		name: 'MUN-SH',
		longName: 'Model United Nations Schleswig-Holstein',
		location: 'Kiel',
		date: 'März / April',
		lang: 'Deutsch',
		website: 'https://mun-sh.de',
		logo: SHLogo
	};

	const munBw = {
		name: 'MUNBW',
		longName: 'Model United Nations Baden-Würtemberg',
		location: 'Stuttgart',
		date: 'Mai / Juni',
		lang: 'Deutsch',
		website: 'https://munbw.de',
		logo: BWLogo
	};
</script>

<div class="w-full min-h-screen bg-light-blue-500 flex flex-col items-center p-4">
	<hero class="my-20 text-center">
		<h2 class="text-2xl text-base-content font-thin">MUNify</h2>
		<h1 class="text-4xl text-base-content font-bold uppercase tracking-widest">Delegator</h1>
		<p class="text-lg text-base-content mt-4">{m.homeHeroSub()}</p>
	</hero>

	<main class="flex flex-col gap-20">
		<section
			class="w-full flex flex-col md:flex-row justify-center items-center md:items-stretch gap-10"
		>
			<UndrawCard
				titel={m.homeRegistration()}
				img={UdteamUp}
				btnText={m.homeRegistrationBtn()}
				btnLink="/registration"
			>
				<p>{m.homeRegistrationSub()}</p>
			</UndrawCard>

			<UndrawCard
				titel={m.homeYourConferences()}
				img={UdProgress}
				btnText={m.homeYourConferencesBtn()}
				btnLink="/dashboard"
			>
				<p>{m.homeYourConferencesSub()}</p>
			</UndrawCard>
		</section>
		<section class="flex justify-center items-center">
			<div class="alert alert-warning max-ch-md" role="alert">
				<i class="fas fa-wrench"></i>
				<span>{m.homeDraftDisclaimer()}</span>
			</div>
		</section>
		<section class="flex flex-col gap-6 items-center">
			<h2 class="text-3xl text-center">{m.homeOurConferences()}</h2>
			<div class="flex flex-col md:flex-row gap-4">
				<div class="card bg-base-100 dark:bg-base-200 shadow-lg">
					<figure class="bg-slate-100 flex justify-center items-center p-6 h-60">
						<img src={munSh.logo} alt="Conference" class="h-full" />
					</figure>
					<div class="card-body">
						<h2 class="card-title">{munSh.name}</h2>
						<p class="font-thin font-xs">{munSh.longName}</p>
						<CardInfoSectionWithIcons
							items={[
								{ icon: 'fa-location-dot', text: munSh.location },
								{ icon: 'fa-calendar', text: munSh.date },
								{ icon: 'fa-comments', text: munSh.lang },
								{ icon: 'fa-globe', text: munSh.website, link: munSh.website }
							]}
						/>
					</div>
				</div>
				<div class="card bg-base-100 dark:bg-base-200 shadow-lg">
					<figure class="bg-slate-100 flex justify-center items-center p-6 h-60">
						<img src={munBw.logo} alt="Conference" class="h-full" />
					</figure>
					<div class="card-body">
						<h2 class="card-title">{munBw.name}</h2>
						<p class="font-thin font-xs">{munBw.longName}</p>
						<CardInfoSectionWithIcons
							items={[
								{ icon: 'fa-location-dot', text: munBw.location },
								{ icon: 'fa-calendar', text: munBw.date },
								{ icon: 'fa-comments', text: munBw.lang },
								{ icon: 'fa-globe', text: munBw.website, link: munBw.website }
							]}
						/>
					</div>
				</div>
			</div>
		</section>
		<section class="w-full flex flex-col gap-6 max-w-[800px] text-center">
			<h2 class="text-3xl">{m.homeAboutUs()}</h2>
			<p>{m.homeAboutUsText()}</p>
		</section>
	</main>
	<Footer />
</div>
