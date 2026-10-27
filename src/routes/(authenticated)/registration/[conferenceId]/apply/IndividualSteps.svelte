<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { untrack } from 'svelte';
	import { client } from '#lib/api/rumbleClient/client.js';
	import RoleChoiceGrid from '#lib/components/registration/RoleChoiceGrid.svelte';
	import FlowStep from './FlowStep.svelte';
	import ApplicationTextsSteps from './ApplicationTextsSteps.svelte';

	/** Applying alone: a role, then the questions. */
	interface Props {
		conferenceId: string;
		/** A role chosen before, by a link that named one. */
		initialRoleId?: string;
	}

	let { conferenceId, initialRoleId }: Props = $props();

	// Seeded once from the link that named the role; choosing another replaces it.
	// (The dashboard keys the form by the link, so the prop cannot change while it is open.)
	const linkedRoleId = untrack(() => initialRoleId);
	const linkedRole = linkedRoleId
		? await client.query.conferenceRole({ __args: { id: linkedRoleId }, name: true })
		: undefined;
	let role = $state<{ id: string; name: string } | undefined>(
		linkedRoleId && linkedRole ? { id: linkedRoleId, name: linkedRole.name ?? '' } : undefined
	);
</script>

<FlowStep
	number={2}
	title={m.registrationStepChooseRole()}
	description={m.individualApplicationDescription2()}
	summary={role?.name}
	onEdit={() => (role = undefined)}
	scrollIntoView
>
	<RoleChoiceGrid
		{conferenceId}
		actionLabel={m.chooseThisRole()}
		onChoose={(chosen) => {
			role = chosen;
		}}
	/>
</FlowStep>

{#if role}
	{@const roleId = role.id}
	<ApplicationTextsSteps
		firstNumber={3}
		schoolLabel={m.whichSchoolAreYouFrom()}
		motivationLabel={m.singleApplicationMotivation()}
		experienceLabel={m.singleApplicationExperience()}
		submitLabel={m.individualApplication()}
		submit={(answers) =>
			client.mutate.createSingleParticipant({
				__args: { ...answers, conferenceId, roleId },
				id: true
			})}
	/>
{/if}
