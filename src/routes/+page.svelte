<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { type PageData } from './$houdini';
	import SHLogo from '$assets/logo/mun-sh_logo.png';
	import BWLogo from '$assets/logo/munbw_logo.png';
	import UdteamUp from '$assets/undraw/team-up.svg';
	import UdProgress from '$assets/undraw/progress.svg';
	import UndrawCard from '$lib/components/UndrawCard.svelte';
	import { configPublic } from '$config/public';
	import CardInfoSectionWithIcons from '$lib/components/CardInfoSectionWithIcons.svelte';
	import ConferenceStatusLight from './ConferenceStatusLight.svelte';

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

	let { data }: { data: PageData } = $props();
	let conferencesPreview = $derived(data.ConferencesPreview);
	let conferenceList = $derived($conferencesPreview.data?.findManyConferences ?? []);

	let conferencesToDisplay = $derived(conferenceList);
</script>

<div class="flex min-h-screen w-full flex-col items-center p-4">
	<hero class="my-20 text-center">
		<i class="fa-duotone fa-id-card-clip text-base-content mb-6 text-6xl"></i>
		<h2 class="text-base-content text-2xl font-thin">MUNify</h2>
		<h1 class="text-base-content text-4xl font-bold tracking-widest uppercase">Delegator</h1>
		<p class="text-base-content mt-4 text-lg">{m.homeHeroSub()}</p>
	</hero>

	<main class="flex flex-col gap-20">
		<section
			class="flex w-full flex-col items-center justify-center gap-10 md:flex-row md:items-stretch"
		>
			<UndrawCard
				title={m.homeRegistration()}
				img={UdteamUp}
				btnText={m.homeRegistrationBtn()}
				btnLink="/registration"
			>
				<p>{m.homeRegistrationSub()}</p>
				{#each conferencesToDisplay as conference (conference.id)}
					<div class="mt-2 flex flex-col">
						<ConferenceStatusLight {conference} />
					</div>
				{/each}
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
		<section class="flex flex-col items-center justify-center gap-4">
			<div class="alert alert-warning max-ch-md" role="alert">
				<i class="fas fa-wrench text-2xl"></i>
				<div class="flex flex-col gap-2">
					<h2 class="text-xl font-bold">{m.homeDraftDisclaimerHeader()}</h2>
					<p>{@html m.homeDraftDisclaimer()}</p>
				</div>
			</div>
			{#if configPublic.PUBLIC_FEEDBACK_URL}
				<div class="alert alert-info max-ch-md" role="alert">
					<i class="fas fa-bug text-2xl"></i>
					<div class="flex flex-col gap-2">
						<h2 class="text-xl font-bold">{m.feedback()}</h2>
						<p>{m.homeDraftPleaseHelp()}</p>
						<a
							href={configPublic.PUBLIC_FEEDBACK_URL}
							target="_blank"
							class="btn btn-primary sm:btn-wide shadow-md"
						>
							<i class="fas fa-bullhorn"></i>
							{m.feedbackBoard()}
						</a>
					</div>
				</div>
			{/if}
			<div class="alert alert-error max-ch-md" role="alert">
				<i class="fa-solid fa-message-question text-2xl"></i>
				<div class="flex flex-col gap-2">
					<h2 class="text-xl font-bold">{m.homeHelpWithTechnicalIssuesHeadline()}</h2>
					<p>{@html m.homeHelpWithTechnicalIssues()}</p>
				</div>
			</div>
		</section>
		<section class="flex flex-col items-center gap-6">
			<h2 class="text-center text-3xl">{m.homeOurConferences()}</h2>
			<div class="flex flex-col gap-4 md:flex-row">
				<div class="card bg-base-100 border-base-200 border shadow-lg">
					<figure class="bg-base-300 flex h-60 items-center justify-center p-6">
						<img src={munSh.logo} alt="Conference" class="h-full" />
					</figure>
					<div class="card-body">
						<h2 class="card-title">{munSh.name}</h2>
						<p class="font-xs font-thin">{munSh.longName}</p>
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
				<div class="card bg-base-100 border-base-200 border shadow-lg">
					<figure class="bg-base-300 flex h-60 items-center justify-center p-6">
						<img src={munBw.logo} alt="Conference" class="h-full" />
					</figure>
					<div class="card-body">
						<h2 class="card-title">{munBw.name}</h2>
						<p class="font-xs font-thin">{munBw.longName}</p>
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
		<section class="flex w-full max-w-[800px] flex-col gap-6 text-center">
			<h2 class="text-3xl">{m.homeAboutUs()}</h2>
			<p>{m.homeAboutUsText()}</p>
		</section>
	</main>
</div>
