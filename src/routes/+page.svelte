<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { resolve } from '$app/paths';
	import { reveal } from '$lib/attachments/reveal';
	import SHLogo from '$assets/logo/mun-sh_logo.png';
	import BWLogo from '$assets/logo/munbw_logo.png';
	import zweig from '$assets/logo/dmun-zweig-halbtransparent.svg';
	import UdteamUp from '$assets/undraw/team-up.svg';
	import UdQuestion from '$assets/undraw/question.svg';
	import world from '$assets/undraw/world.svg';
	import blob from '$assets/misc/blobs/blob_2.svg';
	import { configPublic } from '$config/public';
	import AccentStripe from '$lib/components/AccentStripe.svelte';
	import CardInfoSectionWithIcons from '$lib/components/CardInfoSectionWithIcons.svelte';
	import ConferenceStatusLight from './ConferenceStatusLight.svelte';
	import HomeCard from './HomeCard.svelte';
	import HomeNavbar from './HomeNavbar.svelte';

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

	const conferences = [munSh, munBw];

	const badges = [munSh.name, munBw.name, m.homeBadgeOpenSource()];

	const conferencesToDisplay = await client.liveQuery.conferences({
		id: true,
		state: true,
		startAssignment: true,
		location: true,
		title: true,
		totalSeats: true,
		totalParticipants: true,
		waitingListLength: true
	});
</script>

<div class="bg-base-100 w-full">
	<HomeNavbar />

	<section
		class="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-16 gap-y-12 px-4 pt-10 pb-16 md:px-12 lg:pt-24 lg:pb-32"
	>
		<div class="flex flex-[1_1_420px] flex-col items-start gap-7">
			<div class="enter-draw" style="--enter-delay: 150ms">
				<AccentStripe />
			</div>
			<p class="enter-up text-xl leading-none font-bold" style="--enter-delay: 250ms">
				{m.homeHeroSubline()}
			</p>
			<h1
				class="enter-up text-5xl leading-none font-extralight tracking-tight lg:text-[67px]"
				style="--enter-delay: 350ms"
			>
				<span class="font-bold">MUN</span>
				{m.homeCaption()}
			</h1>
			<p
				class="enter-up max-w-[34ch] text-xl leading-[1.3] font-light"
				style="--enter-delay: 450ms"
			>
				{m.homeHeroSub()}
			</p>
			<div class="enter-up mt-1 flex flex-wrap gap-3" style="--enter-delay: 550ms">
				<a class="btn btn-primary btn-lg" href={resolve('/dashboard')}>
					{m.homeConferencesBtn()}
				</a>
			</div>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each badges as label, i (label)}
					<span
						class="enter-up badge bg-base-200 border-0 text-xs font-bold"
						style="--enter-delay: {650 + i * 70}ms"
					>
						{label}
					</span>
				{/each}
			</div>
		</div>
		<div class="relative flex min-w-0 flex-[1_1_380px] items-center justify-center py-2 sm:py-6">
			<img
				src={blob}
				alt=""
				aria-hidden="true"
				class="enter-shape pointer-events-none absolute h-[124%] w-[116%] object-contain dark:opacity-20"
				style="inset: -12% -8%; --enter-delay: 100ms"
			/>
			<div
				class="enter-up relative w-full max-w-[320px] sm:max-w-[560px]"
				style="--enter-delay: 400ms"
			>
				<img src={world} alt="" class="drift block h-auto w-full" />
			</div>
		</div>
	</section>

	<section class="mx-auto flex max-w-[1200px] flex-col gap-12 px-4 pb-16 md:px-12 lg:pb-32">
		<div class="enter-up flex flex-col gap-3" style="--enter-delay: 750ms">
			<span class="text-accent-600 text-xs font-bold tracking-[0.08em] uppercase">
				{m.homeFeaturesEyebrow()}
			</span>
			<h2 class="text-primary text-[27px] leading-none font-bold">{m.homeFeaturesTitle()}</h2>
		</div>
		<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
			<div class="enter-up h-full" style="--enter-delay: 850ms">
				<HomeCard
					src={UdteamUp}
					header={m.homeConferencesCardTitle()}
					btnText={m.homeConferencesBtn()}
					btnLink={resolve('/dashboard')}
				>
					<p>{m.homeConferencesCardSub()}</p>
					{#each conferencesToDisplay as conference (conference.id)}
						<ConferenceStatusLight {conference} />
					{/each}
				</HomeCard>
			</div>
			<div class="enter-up h-full" style="--enter-delay: 950ms">
				<HomeCard src={UdQuestion} header={m.homeHelpCardTitle()}>
					<p>{m.homeHelpWithTechnicalIssuesHeadline()}</p>
					<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation string authored in messages/ -->
					<p>{@html m.homeHelpWithTechnicalIssues()}</p>
					{#if configPublic.PUBLIC_FEEDBACK_URL}
						<a
							href={configPublic.PUBLIC_FEEDBACK_URL}
							target="_blank"
							rel="external"
							class="link link-primary mt-2 font-bold"
						>
							{m.feedbackBoard()}
						</a>
					{/if}
				</HomeCard>
			</div>
		</div>
	</section>

	<section class="mx-auto max-w-[1200px] px-4 pb-16 md:px-12 lg:pb-32">
		<div class="flex flex-col gap-3" {@attach reveal}>
			<span class="text-accent-600 text-xs font-bold tracking-[0.08em] uppercase">
				{m.homeConferencesEyebrow()}
			</span>
			<h2 class="text-primary text-[27px] leading-none font-bold">{m.homeOurConferences()}</h2>
		</div>
		<div class="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
			{#each conferences as conference, i (conference.name)}
				<div
					class="card border-base-300 bg-base-100 border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
					style="--enter-delay: {i * 120}ms"
					{@attach reveal}
				>
					<figure class="bg-base-200 flex h-60 items-center justify-center p-6">
						<img src={conference.logo} alt={conference.name} class="h-full" />
					</figure>
					<div class="card-body">
						<h3 class="text-primary text-xl leading-none font-light">{conference.name}</h3>
						<p class="text-sm font-thin">{conference.longName}</p>
						<CardInfoSectionWithIcons
							items={[
								{ fontAwesomeIcon: 'fa-location-dot', text: conference.location },
								{ fontAwesomeIcon: 'fa-calendar', text: conference.date },
								{ fontAwesomeIcon: 'fa-comments', text: conference.lang },
								{ fontAwesomeIcon: 'fa-globe', text: conference.website, link: conference.website }
							]}
						/>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section class="bg-neutral text-neutral-content relative overflow-hidden">
		<img
			src={zweig}
			alt=""
			aria-hidden="true"
			class="pointer-events-none absolute -top-[8%] -left-[6%] w-[44%] select-none dark:hidden"
		/>
		<div
			class="relative mx-auto flex max-w-[1200px] flex-col items-start gap-6 px-4 py-18 md:items-end md:px-12 md:text-right lg:py-32"
			{@attach reveal}
		>
			<AccentStripe long inverse />
			<h2 class="text-[27px] leading-none font-bold">{m.homeAboutUs()}</h2>
			<p class="max-w-[66ch] text-[15px] leading-[1.4]">{m.homeAboutUsText()}</p>
			<a
				class="btn border-neutral-content bg-neutral-content text-neutral"
				href="https://dmun.de"
				target="_blank"
				rel="noopener noreferrer"
			>
				dmun.de
			</a>
		</div>
	</section>

	<section class="mx-auto max-w-[1200px] px-4 py-16 md:px-12 lg:py-24">
		<div class="flex flex-col items-start gap-4" {@attach reveal}>
			<h2 class="text-primary text-xl leading-none font-light">{m.homeContributeTitle()}</h2>
			<p class="max-w-[66ch] text-[15px] leading-[1.3]">{m.homeContributeText()}</p>
			<a
				class="link link-primary font-bold"
				href="https://github.com/DeutscheModelUnitedNations/munify-delegator"
				target="_blank"
				rel="noopener noreferrer"
			>
				{m.homeContributeLink()}
			</a>
		</div>
	</section>
</div>
