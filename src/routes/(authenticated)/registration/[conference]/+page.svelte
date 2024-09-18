<script lang="ts">
	import CardInfoSectionWithIcons from '$lib/components/CardInfoSectionWithIcons.svelte';
	import UndrawCard from '$lib/components/UndrawCard.svelte';
	import AssistentModal from '$lib/components/AssistentModal/Modal.svelte';
	import * as m from '$lib/paraglide/messages.js';

	import UndrawNew from '$assets/undraw/new.svg';
	import UndrawTeam from '$assets/undraw/team.svg';
	import UndrawLetter from '$assets/undraw/letter.svg';
	import UndrawEducator from '$assets/undraw/educator.svg';

	import type { PageData } from './$types';
	import MermaidWrapper from '$lib/components/MermaidWrapper.svelte';
	import RegistrationBreadcrumbs from '$lib/components/RegistrationBreadcrumbs.svelte';

	let { data }: { data: PageData } = $props();

	const breadcrumbs = [
		{ href: '/registration', icon: 'user-plus' },
		{
			href: `/registration/${data.conferenceId}`,
			title: data.conferenceData.title
		}
	];

	let showAssistent = $state(false);

	let delegationBlocked = $derived(() => {
		if (!data.userData) return false;
		if (data.userData.singleParticipant.some((p) => p.conferenceId === data.conferenceId)) {
			return true;
		}
		if (data.userData.delegationMemberships.some((d) => d.conferenceId === data.conferenceId)) {
			return true;
		}
		if (data.userData.conferenceSupervisor.some((s) => s.conferenceId === data.conferenceId)) {
			return true;
		}
	});
	let individualBlocked = $derived(() => {
		if (!data.userData) return false;
		if (data.userData.delegationMemberships.some((d) => d.conferenceId === data.conferenceId)) {
			return true;
		}
		if (data.userData.conferenceSupervisor.some((s) => s.conferenceId === data.conferenceId)) {
			return true;
		}
	});
	let supervisorBlocked = $derived(() => {
		if (!data.userData) return false;
		if (data.userData.singleParticipant.some((p) => p.conferenceId === data.conferenceId)) {
			return true;
		}
		if (data.userData.delegationMemberships.some((d) => d.conferenceId === data.conferenceId)) {
			return true;
		}
	});
</script>

<div class="w-full min-h-screen bg-light-blue-500 flex flex-col items-center p-4">
	<RegistrationBreadcrumbs {breadcrumbs} />
	<hero class="my-20 text-center">
		<h1 class="text-3xl tracking-wider uppercase mb-3">{m.signup()}</h1>
		<p class="max-ch-md">
			{m.conferenceSignupIntroduction()}
		</p>
		<div role="alert" class="alert mt-10">
			<i class="fa-duotone fa-message-question text-xl mx-1"></i>
			<div class="flex flex-col">
				<div class="font-bold tracking-wider">{m.signUpAssistant()}</div>
				<div class="max-ch-sm">
					{m.signUpAssistantDescription()}
				</div>
			</div>
			<div>
				<button class="btn btn-sm btn-primary" onclick={() => (showAssistent = true)}
					>{m.openAssistant()}</button
				>
			</div>
		</div>
	</hero>

	<main>
		<section
			class="w-full flex flex-col md:flex-row justify-center items-center md:items-stretch gap-8 flex-wrap"
		>
			<UndrawCard
				title={m.createDelegation()}
				img={UndrawNew}
				btnText={m.createDelegation()}
				btnLink={`${data.conferenceId}/create`}
				disabled={delegationBlocked()}
			>
				<CardInfoSectionWithIcons
					items={[
						{
							fontAwesomeIcon: 'fa-arrow-right',
							text: m.createDelegationDescription()
						}
					]}
				/>
			</UndrawCard>

			<UndrawCard
				title={m.joinDelegation()}
				img={UndrawTeam}
				btnText={m.enterCode()}
				btnLink={`${data.conferenceId}/join`}
				disabled={delegationBlocked()}
			>
				<CardInfoSectionWithIcons
					items={[
						{
							fontAwesomeIcon: 'fa-arrow-right',
							text: m.joinDelegationDescription()
						}
					]}
				/>
			</UndrawCard>

			<UndrawCard
				title={m.individualApplication()}
				img={UndrawLetter}
				btnText={m.individualApplication()}
				btnLink={`${data.conferenceId}/individual`}
				disabled={individualBlocked()}
			>
				<CardInfoSectionWithIcons
					items={[
						{
							fontAwesomeIcon: 'fa-arrow-right',
							text: m.individualApplicationDescription()
						}
					]}
				/>
			</UndrawCard>

			<UndrawCard
				title={m.supervisor()}
				img={UndrawEducator}
				btnText={m.applyAsSupervisor()}
				btnLink={`${data.conferenceId}/supervisor`}
				disabled={supervisorBlocked()}
			>
				<CardInfoSectionWithIcons
					items={[
						{
							fontAwesomeIcon: 'fa-arrow-right',
							text: m.applyAsSupervisorDescription()
						}
					]}
				/>
			</UndrawCard>
		</section>
		<section class="mt-20 text-center">
			<h2 class="text-2xl font-bold mb-2">Wie bewerbe ich mich?</h2>
			<p class="mb-4">Das folgende Diagramm stellt dar, wie Sie sich auf welche Rolle bewerben.</p>
			<div
				class="mx-auto card bg-[#f6f7fb] shadow-lg p-4 w-full max-w-[1000px] flex justify-center items-center"
			>
				<MermaidWrapper
					diagram={`\
						%%{
							init: {
								'themeVariables': {
									'edgeLabelBackground':'#f6f7fb'
								}
							}
						}%%
					flowchart TD
						A(Welche Rolle möchte ich auf der Konferenz einnehmen?):::question
						
						A --> Delegate(fa:fa-flag\nDelegierter\neines Landes):::role
						A --> NSA(fa:fa-megaphone\nNichtstaatliche*r\nAkteur*in):::role
						NSA --> B(Habe ich Personen, mit denen\nich mich als Gruppe bewerben kann?):::question
						Delegate --> B

						B -->|Ja| C(Hat eine der Personen schon\neine Delegation angelegt?):::question
						B --->|Nein| Individual{fa:fa-envelope\nEinzel-\nbewerbung}:::outcome

						C --> |Nein| E{fa:fa-plus\nDelegation\nanlegen}:::outcome
						C --> |Ja| D{fa:fa-right-to-bracket\nDelegation\nbeitreten}:::outcome

						A --> Journalist(fa:fa-newspaper\nJournalist*in):::role ----> Individual
						A --> Special(fa:fa-gavel\nSpezielle Rolle):::role ----> Individual

						A --> Supervisor(fa:fa-chalkboard-user\nBetreuer*in):::role
						Supervisor --> F(Haben meine Schüler*innen\nschon eine oder mehrere\nDelegationen erstellt?):::question
						F -.-> |Nein| Wait(fa:fa-hourglass-clock\nAuf Anmeldung\nIhrer Schüler*innen\nwarten):::wait
						F ---> |Ja| G{fa:fa-right-to-bracket\nAnmeldung als\nBetreuer*in}:::outcome
						
						classDef question fill:#3d7dd2,stroke-width:3px,stroke:#3d7dd2,color:white,font-family:Outfit;
						classDef role fill:#f9f9f9,stroke:#333,stroke-width:1px,font-family:Outfit;
						classDef outcome fill:#cfc,stroke-width:3px,font-family:Outfit;
						classDef wait fill:#fbb,stroke:#000,stroke-width:1px,font-family:Outfit;

						linkStyle default stroke-width:3px;

						click E "/registration/${data.conferenceId}/create"
						click D "/registration/${data.conferenceId}/join"
						click Individual "/registration/${data.conferenceId}/individual"
						click G "/registration/${data.conferenceId}/supervisor"
				`}
				></MermaidWrapper>
			</div>
		</section>
	</main>
</div>

{#if showAssistent}
	<AssistentModal onClose={() => (showAssistent = false)} conferenceId={data.conferenceId} />
{/if}
