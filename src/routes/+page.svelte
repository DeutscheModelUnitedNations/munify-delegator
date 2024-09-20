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
	import { env } from '$env/dynamic/public';

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

<svelte:head>
	<title>MUNify Delegator</title>
</svelte:head>

<div class="w-full min-h-screen bg-light-blue-500 flex flex-col items-center p-4">
	<hero class="my-20 text-center">
		<i class="fa-duotone fa-id-card-clip text-6xl text-base-content mb-6"></i>
		<h2 class="text-2xl text-base-content font-thin">MUNify</h2>
		<h1 class="text-4xl text-base-content font-bold uppercase tracking-widest">Delegator</h1>
		<p class="text-lg text-base-content mt-4">{m.homeHeroSub()}</p>
	</hero>

	<main class="flex flex-col gap-20">
		<section
			class="w-full flex flex-col md:flex-row justify-center items-center md:items-stretch gap-10"
		>
			<UndrawCard
				title={m.homeRegistration()}
				img={UdteamUp}
				btnText={m.homeRegistrationBtn()}
				btnLink="/registration"
			>
				<p>{m.homeRegistrationSub()}</p>
			</UndrawCard>

			<UndrawCard
				title={m.homeYourConferences()}
				img={UdProgress}
				btnText={m.homeYourConferencesBtn()}
				btnLink="/dashboard"
			>
				<p>{m.homeYourConferencesSub()}</p>
			</UndrawCard>
		</section>
		<section class="flex flex-col justify-center items-center gap-4">
			<div class="alert alert-warning max-ch-md" role="alert">
				<i class="fas fa-wrench text-2xl"></i>
				<div class="flex flex-col gap-2">
					<h2 class="font-bold text-xl">{m.homeDraftDisclaimerHeader()}</h2>
					<p>{m.homeDraftDisclaimer()}</p>
				</div>
			</div>
			<div class="alert alert-info max-ch-md" role="alert">
				<i class="fas fa-bug text-2xl"></i>
				<div class="flex flex-col gap-2">
					<h2 class="font-bold text-xl">{m.feedback()}</h2>
					<p>{m.homeDraftPleaseHelp()}</p>
					<a
						href={env.PUBLIC_FEEDBACK_URL}
						target="_blank"
						class="btn btn-primary shadow-md sm:btn-wide"
					>
						<i class="fas fa-bullhorn"></i>
						{m.feedbackBoard()}
					</a>
				</div>
			</div>
			<div class="alert alert-error max-ch-md" role="alert">
				<i class="fa-solid fa-message-question text-2xl"></i>
				<div class="flex flex-col gap-2">
					<h2 class="font-bold text-xl">{m.homeHelpWithTechnicalIssuesHeadline()}</h2>
					<p>{@html m.homeHelpWithTechnicalIssues()}</p>
				</div>
			</div>
		</section>
		<section class="flex flex-col gap-6 items-center">
			<h2 class="text-3xl text-center">{m.homeOurConferences()}</h2>
			<div class="flex flex-col md:flex-row gap-4">
				<div class="card bg-base-100 dark:bg-base-200 shadow-lg">
					<figure class="bg-base-300 flex justify-center items-center p-6 h-60">
						<img src={munSh.logo} alt="Conference" class="h-full" />
					</figure>
					<div class="card-body">
						<h2 class="card-title">{munSh.name}</h2>
						<p class="font-thin font-xs">{munSh.longName}</p>
						<CardInfoSectionWithIcons
							items={[
								{ fontAwesomeIcon: 'fa-location-dot', text: munSh.location },
								{ fontAwesomeIcon: 'fa-calendar', text: munSh.date },
								{ fontAwesomeIcon: 'fa-comments', text: munSh.lang },
								{ fontAwesomeIcon: 'fa-globe', text: munSh.website, link: munSh.website }
							]}
						/>
					</div>
				</div>
				<div class="card bg-base-100 dark:bg-base-200 shadow-lg">
					<figure class="bg-base-300 flex justify-center items-center p-6 h-60">
						<img src={munBw.logo} alt="Conference" class="h-full" />
					</figure>
					<div class="card-body">
						<h2 class="card-title">{munBw.name}</h2>
						<p class="font-thin font-xs">{munBw.longName}</p>
						<CardInfoSectionWithIcons
							items={[
								{ fontAwesomeIcon: 'fa-location-dot', text: munBw.location },
								{ fontAwesomeIcon: 'fa-calendar', text: munBw.date },
								{ fontAwesomeIcon: 'fa-comments', text: munBw.lang },
								{ fontAwesomeIcon: 'fa-globe', text: munBw.website, link: munBw.website }
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
