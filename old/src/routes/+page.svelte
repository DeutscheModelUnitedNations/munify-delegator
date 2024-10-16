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

	let { data } = $props();

	const openRegistrations = $derived(() => {
		return data.conferences
			.filter((c) => {
				if (!c.startRegistration || !c.endRegistration) return false;
				return (
					new Date(c.startRegistration).getTime() < new Date().getTime() &&
					new Date(c.endRegistration).getTime() > new Date().getTime()
				);
			})
			.sort(
				(a, b) =>
					new Date(b.startRegistration!).getTime() - new Date(a.startRegistration!).getTime()
			);
	});
</script>

<svelte:head>
	<title>MUNify Delegator</title>
</svelte:head>

<div class="bg-light-blue-500 flex min-h-screen w-full flex-col items-center p-4">
	<hero class="my-20 text-center">
		<i class="fa-duotone fa-id-card-clip mb-6 text-6xl text-base-content"></i>
		<h2 class="text-2xl font-thin text-base-content">MUNify</h2>
		<h1 class="text-4xl font-bold uppercase tracking-widest text-base-content">Delegator</h1>
		<p class="mt-4 text-lg text-base-content">{m.homeHeroSub()}</p>
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
				{#if openRegistrations().length > 0}
					<ul class="live-list mt-2">
						{#each openRegistrations() as conference}
							<li>
								<span></span>
								{conference.title}
							</li>
						{/each}
					</ul>
				{/if}
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
			<div class="alert alert-info max-ch-md" role="alert">
				<i class="fas fa-bug text-2xl"></i>
				<div class="flex flex-col gap-2">
					<h2 class="text-xl font-bold">{m.feedback()}</h2>
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
					<h2 class="text-xl font-bold">{m.homeHelpWithTechnicalIssuesHeadline()}</h2>
					<p>{@html m.homeHelpWithTechnicalIssues()}</p>
				</div>
			</div>
		</section>
		<section class="flex flex-col items-center gap-6">
			<h2 class="text-center text-3xl">{m.homeOurConferences()}</h2>
			<div class="flex flex-col gap-4 md:flex-row">
				<div class="card bg-base-100 shadow-lg dark:bg-base-200">
					<figure class="flex h-60 items-center justify-center bg-base-300 p-6">
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
				<div class="card bg-base-100 shadow-lg dark:bg-base-200">
					<figure class="flex h-60 items-center justify-center bg-base-300 p-6">
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
	<Footer />
</div>

<style lang="postcss">
	.live-list {
		list-style: none;
		@apply mt-4;
	}

	.live-list li {
		position: relative;

		@apply mx-2 my-1 pl-6;
	}

	.live-list span {
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 10px; /* Size of the dot */
		height: 10px; /* Size of the dot */
		background-color: green; /* Dot color */
		border-radius: 50%; /* Make it a circle */
		box-shadow: 0 0 5px rgba(0, 255, 0, 0.2); /* Initial glow */
		animation: pulsate 1.5s infinite; /* Animation */
	}

	@keyframes pulsate {
		0% {
			box-shadow: 0 0 3px rgba(0, 115, 0, 0.2);
			transform: translateY(-50%) scale(1);
		}
		50% {
			box-shadow: 0 0 10px rgb(0, 115, 0); /* Glow effect */
			transform: translateY(-50%) scale(1.1); /* Slightly enlarge */
		}
		100% {
			box-shadow: 0 0 5px rgba(0, 115, 0, 0.2);
			transform: translateY(-50%) scale(1);
		}
	}
</style>
