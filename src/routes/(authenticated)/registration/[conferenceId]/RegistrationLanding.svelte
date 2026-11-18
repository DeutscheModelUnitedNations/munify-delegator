<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getOptionalCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { fetchExistingRegistrations } from './existingRegistrations';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import AssistantModal from './AssistantModal/Modal.svelte';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { getRegistrationStatus } from '#lib/utils/registrationStatus';
	import NotParticipatingHint from '#lib/components/dashboard/NotParticipatingHint.svelte';
	import ConferenceLanguageNotice from '#lib/components/registration/ConferenceLanguageNotice.svelte';

	import MermaidWrapper from '#lib/components/MermaidWrapper.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import ApplyFlow from './apply/ApplyFlow.svelte';
	import { applyHref, applyPathOf } from './apply/applyPaths';

	let { conferenceId }: { conferenceId: string } = $props();

	const currentUser = $derived(await getOptionalCurrentUser());

	/** Which of the three registration paths the caller has already taken, if any. */
	const existing = $derived(
		currentUser
			? await fetchExistingRegistrations({ conferenceId, userId: currentUser.sub })
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
		getRegistrationStatus({
			conferenceState: conference.state,
			applicationDeadline: new Date(conference.applicationDeadline)
		})
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

	// Open under the link they were opened at: following one of their answers closes them.
	let assistantOpenAt = $state<string>();
	let diagramOpenAt = $state<string>();
</script>

{#if status !== 'OPEN'}
	<NotParticipatingHint {conferenceId} {status} />
{:else}
	<DashboardSection icon="signature" title={m.signup()}>
		{#snippet headerAction()}
			<a
				class="btn btn-ghost btn-sm"
				href={resolve(`dashboard/${conferenceId}/seats`)}
				data-tour="registration.seats"
			>
				<i aria-hidden="true" class="ph-duotone ph-chair"></i>
				<span class="max-sm:hidden">{m.conferenceSeats()}</span>
			</a>
		{/snippet}

		<p class="text-base-content/80 max-w-3xl">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation string authored in messages/ -->
			{@html m.conferenceSignupIntroduction()}
		</p>

		<ConferenceLanguageNotice {conferenceId} class="mt-3 max-w-3xl" />

		<div
			class="border-base-300 mt-6 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center"
			data-tour="registration.assistant"
		>
			<p class="text-base-content/70 flex-1 text-sm">{m.signUpAssistant()}</p>
			<div class="flex flex-wrap gap-2">
				<button
					class="btn btn-ghost btn-sm"
					type="button"
					onclick={() => (diagramOpenAt = applyLink)}
				>
					<i aria-hidden="true" class="ph-duotone ph-tree-structure"></i>
					{m.howDoIApply()}
				</button>
				<button
					class="btn btn-primary btn-soft btn-sm"
					type="button"
					onclick={() => (assistantOpenAt = applyLink)}
				>
					<i aria-hidden="true" class="ph-duotone ph-sparkle"></i>
					{m.openAssistant()}
				</button>
			</div>
		</div>
	</DashboardSection>

	<Modal
		open={diagramOpenAt === applyLink}
		onclose={() => (diagramOpenAt = undefined)}
		title={m.howDoIApply()}
		fullWidth
	>
		<p class="text-base-content/70 text-sm">{m.thisDiagramShowHowToApply()}</p>
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
					A --> NSA[fa:fa-megaphone-simple\n${m.nonStateActorDiagram()}]:::role
					NSA --> B[${m.doIHavePeopleToApplyWith()}]:::question
					Delegate --> B

					B -->|${m.yes()}| C[${m.didSomeoneOfTheseAlreadyCreateADelegation()}]:::question
					B --->|${m.no()}| Individual{fa:fa-envelope\n${m.individualApplicationDiagram()}}:::outcome

					C --> |${m.no()}| E{fa:fa-plus\n${m.createDelegationDiagram()}}:::outcome
					C --> |${m.yes()}| D{fa:fa-sign-in\n${m.joinDelegationDiagram()}}:::outcome

					A --> Journalist[fa:fa-newspaper\n${m.journalist()}]:::role ----> Individual
					A --> Special[fa:fa-gavel\n${m.specialRole()}]:::role ----> Individual

					A --> Supervisor[fa:fa-chalkboard-teacher\n${m.supervisor()}]:::role
					Supervisor --> F[${m.didMyStudentsAlreadyCreateADelegation()}]:::question
					F -.-> |${m.no()}| Wait[fa:fa-clock-countdown\n${m.waitForSignupOfMyStudents()}]:::wait
					F ---> |${m.yes()}| G{fa:fa-sign-in\n${m.signupAsSupervisor()}}:::outcome
		
					classDef question fill:#01548F,stroke-width:1px,stroke:#01548F,color:#FFFFFF,font-family:Outfit;
					classDef role fill:#FFFFFF,stroke:#1B1837,stroke-width:1px,color:#1B1837,font-family:Outfit;
					classDef outcome fill:#b5e4c1,stroke:#1B1837,stroke-width:2px,color:#0e2614,font-family:Outfit;
					classDef wait fill:#fdd2d9,stroke:#F51D42,stroke-width:1px,color:#1B1837,font-family:Outfit;

					linkStyle default stroke-width:2px;

					click E "${applyHref({ conferenceId, path: 'createDelegation' })}"
					click D "${applyHref({ conferenceId, path: 'joinDelegation' })}"
					click Individual "${applyHref({ conferenceId, path: 'individual' })}"
					click G "${applyHref({ conferenceId, path: 'supervisor' })}"
			`}
			/>
		</div>
	</Modal>

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
