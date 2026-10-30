<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { getOptionalCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { fetchExistingRegistrations } from './existingRegistrations';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import AssistantModal from './AssistantModal/Modal.svelte';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { getRegistrationStatus } from '#lib/utils/registrationStatus';
	import NotParticipatingHint from '#lib/components/dashboard/NotParticipatingHint.svelte';

	import MermaidWrapper from '#lib/components/MermaidWrapper.svelte';
	import ApplyFlow from './apply/ApplyFlow.svelte';
	import { applyHref, applyPathOf } from './apply/applyPaths';

	let { conferenceId }: { conferenceId: string } = $props();

	const currentUser = $derived(await getOptionalCurrentUser());

	/** Which of the three registration paths the caller has already taken, if any. */
	const existing = $derived(
		currentUser
			? await fetchExistingRegistrations(conferenceId, currentUser.sub)
			: { singleParticipants: [], delegationMembers: [], supervisors: [] }
	);

	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: conferenceId },
			state: true,
			applicationDeadline: true
		})
	);
	const status = $derived(
		getRegistrationStatus(conference.state, new Date(conference.applicationDeadline))
	);

	// Delegates and supervisors cannot also register as individuals.
	let individualBlocked = $derived(
		existing.delegationMembers.length > 0 || existing.supervisors.length > 0
	);

	// The old registration links and the assistant land here with the path (and an entry code or a
	// role) in the query; the form starts over whenever they name another.
	const applyPath = $derived(applyPathOf(page.url.searchParams.get('apply')));
	const applyCode = $derived(page.url.searchParams.get('code') ?? undefined);
	const applyRole = $derived(page.url.searchParams.get('role') ?? undefined);
	const applyLink = $derived(`${applyPath}/${applyCode}/${applyRole}`);

	// Open under the link it was opened at: following one of its answers closes it.
	let assistantOpenAt = $state<string>();
	let showDiagram = $state(false);
</script>

{#if status !== 'OPEN'}
	<NotParticipatingHint {conferenceId} {status} />
{:else}
	<DashboardSection icon="file-signature" title={m.signup()}>
		{#snippet headerAction()}
			<a class="btn btn-ghost btn-sm" href={resolve(`dashboard/${conferenceId}/seats`)}>
				<i class="fa-sharp-duotone fa-solid fa-person-seat"></i>
				<span class="max-sm:hidden">{m.conferenceSeats()}</span>
			</a>
		{/snippet}

		<p class="text-base-content/80 max-w-3xl">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation string authored in messages/ -->
			{@html m.conferenceSignupIntroduction()}
		</p>

		<div class="bg-base-200 rounded-box mt-6 p-4">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
				<i class="fa-sharp-duotone fa-solid fa-message-question text-info text-2xl"></i>
				<div class="flex-1">
					<p class="font-semibold">{m.signUpAssistant()}</p>
					<p class="text-base-content/70 text-sm">{m.signUpAssistantDescription()}</p>
				</div>
				<div class="flex flex-wrap gap-2">
					<button
						class="btn btn-ghost btn-sm"
						type="button"
						aria-expanded={showDiagram}
						onclick={() => (showDiagram = !showDiagram)}
					>
						<i class="fa-sharp-duotone fa-solid fa-diagram-project"></i>
						{m.howDoIApply()}
						<i
							class="fa-sharp-duotone fa-solid fa-chevron-down text-xs transition-transform duration-300 {showDiagram
								? 'rotate-180'
								: ''}"
						></i>
					</button>
					<button
						class="btn btn-primary btn-sm"
						type="button"
						onclick={() => (assistantOpenAt = applyLink)}
					>
						<i class="fa-sharp-duotone fa-solid fa-sparkles"></i>
						{m.openAssistant()}
					</button>
				</div>
			</div>
			{#if showDiagram}
				<div transition:slide={{ duration: 400, easing: cubicOut }}>
					<p class="text-base-content/70 mt-4 text-sm">{m.thisDiagramShowHowToApply()}</p>
					<!-- The diagram is drawn in light colours, so it keeps a light background in dark mode too. -->
					<div class="rounded-box mt-2 flex justify-center overflow-x-auto bg-white p-4">
						<MermaidWrapper
							diagram={`\
							%%{
								init: {
									'themeVariables': {
										'edgeLabelBackground':'#F0EFF5','lineColor':'#1B1837'
									}
								}
							}%%
						flowchart TD
							A[${m.whichRoleDoIWantToTakeInTheConference()}]:::question
				
							A --> Delegate[fa:fa-flag\n${m.delegateOfACountry()}]:::role
							A --> NSA[fa:fa-megaphone\n${m.nonStateActorDiagram()}]:::role
							NSA --> B[${m.doIHavePeopleToApplyWith()}]:::question
							Delegate --> B

							B -->|${m.yes()}| C[${m.didSomeoneOfTheseAlreadyCreateADelegation()}]:::question
							B --->|${m.no()}| Individual{fa:fa-envelope\n${m.individualApplicationDiagram()}}:::outcome

							C --> |${m.no()}| E{fa:fa-plus\n${m.createDelegationDiagram()}}:::outcome
							C --> |${m.yes()}| D{fa:fa-right-to-bracket\n${m.joinDelegationDiagram()}}:::outcome

							A --> Journalist[fa:fa-newspaper\n${m.journalist()}]:::role ----> Individual
							A --> Special[fa:fa-gavel\n${m.specialRole()}]:::role ----> Individual

							A --> Supervisor[fa:fa-chalkboard-user\n${m.supervisor()}]:::role
							Supervisor --> F[${m.didMyStudentsAlreadyCreateADelegation()}]:::question
							F -.-> |${m.no()}| Wait[fa:fa-hourglass-clock\n${m.waitForSignupOfMyStudents()}]:::wait
							F ---> |${m.yes()}| G{fa:fa-right-to-bracket\n${m.signupAsSupervisor()}}:::outcome
				
							classDef question fill:#01548F,stroke-width:1px,stroke:#01548F,color:#FFFFFF,font-family:Outfit;
							classDef role fill:#FFFFFF,stroke:#1B1837,stroke-width:1px,color:#1B1837,font-family:Outfit;
							classDef outcome fill:#b5e4c1,stroke:#1B1837,stroke-width:2px,color:#0e2614,font-family:Outfit;
							classDef wait fill:#fdd2d9,stroke:#F51D42,stroke-width:1px,color:#1B1837,font-family:Outfit;

							linkStyle default stroke-width:2px;

							click E "${applyHref(conferenceId, 'createDelegation')}"
							click D "${applyHref(conferenceId, 'joinDelegation')}"
							click Individual "${applyHref(conferenceId, 'individual')}"
							click G "${applyHref(conferenceId, 'supervisor')}"
					`}
						/>
					</div>
				</div>
			{/if}
		</div>
	</DashboardSection>

	{#key applyLink}
		<ApplyFlow
			{conferenceId}
			initialPath={applyPath}
			initialCode={applyCode}
			initialRoleId={applyRole}
			{individualBlocked}
		/>
	{/key}

	{#if assistantOpenAt === applyLink}
		<AssistantModal onClose={() => (assistantOpenAt = undefined)} {conferenceId} />
	{/if}
{/if}
