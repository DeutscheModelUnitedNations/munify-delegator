<script lang="ts">
	import CardInfoSectionWithIcons from '$lib/components/CardInfoSectionWithIcons.svelte';
	import UndrawCard from '$lib/components/UndrawCard.svelte';
	import AssistantModal from './AssistantModal/Modal.svelte';
	import * as m from '$lib/paraglide/messages.js';

	import UndrawNew from '$assets/undraw/new.svg';
	import UndrawTeam from '$assets/undraw/team.svg';
	import UndrawLetter from '$assets/undraw/letter.svg';
	import UndrawEducator from '$assets/undraw/educator.svg';

	import type { PageData } from './$houdini';
	import MermaidWrapper from '$lib/components/MermaidWrapper.svelte';

	let { data }: { data: PageData } = $props();
	let conferenceQuery = $derived(data.ConferenceRegistrationQuery);

	let showAssistant = $state(false);

	let delegationBlocked = $derived(() => {
		if (!$conferenceQuery?.data?.findManySingleParticipants) return false;
		if (!$conferenceQuery?.data?.findManyDelegationMembers) return false;
		if (!$conferenceQuery?.data?.findManyConferenceSupervisors) return false;
		if ($conferenceQuery.data.findManySingleParticipants.length > 0) {
			return true;
		}
		if ($conferenceQuery.data.findManyDelegationMembers.length > 0) {
			return true;
		}
		if ($conferenceQuery.data.findManyConferenceSupervisors.length > 0) {
			return true;
		}
	});

	let individualBlocked = $derived(() => {
		if (!$conferenceQuery?.data?.findManyDelegationMembers) return false;
		if (!$conferenceQuery?.data?.findManyConferenceSupervisors) return false;
		if ($conferenceQuery.data.findManyDelegationMembers.length > 0) {
			return true;
		}
		if ($conferenceQuery.data.findManyConferenceSupervisors.length > 0) {
			return true;
		}
	});

	let supervisorBlocked = $derived(() => {
		if (!$conferenceQuery?.data?.findManySingleParticipants) return false;
		if (!$conferenceQuery?.data?.findManyDelegationMembers) return false;
		if ($conferenceQuery.data.findManySingleParticipants.length > 0) {
			return true;
		}
		if ($conferenceQuery.data.findManyDelegationMembers.length > 0) {
			return true;
		}
	});
</script>

<div class="bg-light-blue-500 flex min-h-screen w-full flex-col items-center p-4">
	<hero class="my-20 text-center">
		<h1 class="mb-3 text-3xl uppercase tracking-wider">{m.signup()}</h1>
		<p class="max-ch-md">
			{@html m.conferenceSignupIntroduction()}
		</p>
		<div role="alert" class="alert mt-10">
			<i class="fa-duotone fa-message-question mx-1 text-xl"></i>
			<div class="flex flex-col">
				<div class="font-bold tracking-wider">{m.signUpAssistant()}</div>
				<div class="max-ch-sm">
					{m.signUpAssistantDescription()}
				</div>
			</div>
			<div>
				<button class="btn btn-primary btn-sm" onclick={() => (showAssistant = true)}
					>{m.openAssistant()}</button
				>
			</div>
		</div>
	</hero>

	<main>
		<section
			class="flex w-full flex-col flex-wrap items-center justify-center gap-8 md:flex-row md:items-stretch"
		>
			<UndrawCard
				title={m.createDelegation()}
				img={UndrawNew}
				btnText={m.createDelegation()}
				btnLink={`${data.conferenceId}/create-delegation`}
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
			<h2 class="mb-2 text-2xl font-bold">{m.howDoIApply()}</h2>
			<p class="mb-4">{m.thisDiagramShowHowToApply()}</p>
			<div
				class="card mx-auto flex w-full max-w-[1000px] items-center justify-center bg-[#f6f7fb] p-4 shadow-lg"
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
						A(${m.whichRoleDoIWantToTakeInTheConference()}):::question
						
						A --> Delegate(fa:fa-flag\n${m.delegateOfACountry()}):::role
						A --> NSA(fa:fa-megaphone\n${m.nonStateActorDiagram()}):::role
						NSA --> B(${m.doIhavePeopleToApplyWith()}):::question
						Delegate --> B

						B -->|${m.yes()}| C(${m.didSomeoneOfTheseAlreadyCreateADelegation()}):::question
						B --->|${m.no()}| Individual{fa:fa-envelope\n${m.individualApplicationDiagram()}}:::outcome

						C --> |${m.no()}| E{fa:fa-plus\n${m.createDelegationDiagram()}}:::outcome
						C --> |${m.yes()}| D{fa:fa-right-to-bracket\n${m.joinDelegationDiagram()}}:::outcome

						A --> Journalist(fa:fa-newspaper\n${m.journalist()}):::role ----> Individual
						A --> Special(fa:fa-gavel\n${m.specialRole()}):::role ----> Individual

						A --> Supervisor(fa:fa-chalkboard-user\n${m.supervisor()}):::role
						Supervisor --> F(${m.didMyStudentsAlreadyCreateADelegation()}):::question
						F -.-> |${m.no()}| Wait(fa:fa-hourglass-clock\n${m.waitForSignupOfMyStudents()}):::wait
						F ---> |${m.yes()}| G{fa:fa-right-to-bracket\n${m.signupAsSupervisor()}}:::outcome
						
						classDef question fill:#3d7dd2,stroke-width:3px,stroke:#3d7dd2,color:white,font-family:Outfit;
						classDef role fill:#f9f9f9,stroke:#333,stroke-width:1px,font-family:Outfit;
						classDef outcome fill:#cfc,stroke-width:3px,font-family:Outfit;
						classDef wait fill:#fbb,stroke:#000,stroke-width:1px,font-family:Outfit;

						linkStyle default stroke-width:3px;

						click E "/registration/${data.conferenceId}/create-delegation"
						click D "/registration/${data.conferenceId}/join"
						click Individual "/registration/${data.conferenceId}/individual"
						click G "/registration/${data.conferenceId}/supervisor"
				`}
				></MermaidWrapper>
			</div>
		</section>
	</main>
</div>

{#if showAssistant}
	<AssistantModal onClose={() => (showAssistant = false)} conferenceId={data.conferenceId} />
{/if}
