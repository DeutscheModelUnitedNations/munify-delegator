<script lang="ts">
	import { fly } from 'svelte/transition';
	import { m } from '#lib/paraglide/messages.js';
	import { client } from '#lib/api/rumbleClient/client.js';
	import FlowStep from './FlowStep.svelte';
	import ApplicationTextsSteps from './ApplicationTextsSteps.svelte';
	import type { ApplyPath } from './applyPaths';

	/**
	 * Creating a delegation: what it means, then the questions. Once it exists the dashboard shows
	 * the delegation, with the code that invites the others.
	 */
	interface Props {
		conferenceId: string;
		/** Moves the form to another path, for someone this one turns out not to fit. */
		onSwitchPath: (path: ApplyPath) => void;
	}

	let { conferenceId, onSwitchPath }: Props = $props();

	let understood = $state(false);

	const facts = [
		{
			icon: 'users',
			title: m.createDelegationInfoGroupTitle(),
			text: m.createDelegationInfoGroupText()
		},
		{
			icon: 'medal',
			title: m.createDelegationInfoLeadTitle(),
			text: m.createDelegationInfoLeadText()
		},
		{
			icon: 'chalkboard-user',
			title: m.createDelegationInfoSupervisorTitle(),
			text: m.createDelegationInfoSupervisorText()
		}
	];
	const alternatives: {
		icon: string;
		title: string;
		text: string;
		path: ApplyPath;
		action: string;
	}[] = [
		{
			icon: 'user',
			title: m.createDelegationInfoAloneTitle(),
			text: m.createDelegationInfoAloneText(),
			path: 'individual',
			action: m.individualApplication()
		},
		{
			icon: 'eye',
			title: m.createDelegationInfoSupervisingTitle(),
			text: m.createDelegationInfoSupervisingText(),
			path: 'supervisor',
			action: m.applyAsSupervisor()
		}
	];
</script>

<FlowStep
	number={2}
	title={m.infos()}
	summary={understood ? m.statusLegendDone() : undefined}
	onEdit={() => (understood = false)}
	scrollIntoView
>
	<div class="grid gap-4 md:grid-cols-3">
		{#each facts as fact, index (fact.icon)}
			<div
				class="bg-base-200 rounded-box flex gap-3 p-4"
				in:fly={{ y: 12, duration: 350, delay: 80 * index }}
			>
				<span
					class="bg-primary/10 text-primary rounded-box flex size-10 shrink-0 items-center justify-center text-lg"
				>
					<i class="fa-sharp-duotone fa-solid fa-{fact.icon}"></i>
				</span>
				<span class="flex flex-col gap-1">
					<span class="font-semibold">{fact.title}</span>
					<span class="text-base-content/70 text-sm">{fact.text}</span>
				</span>
			</div>
		{/each}
	</div>

	<div class="mt-4 grid gap-3 md:grid-cols-2">
		{#each alternatives as alternative (alternative.path)}
			<div class="border-base-300 rounded-box flex items-start gap-3 border border-dashed p-4">
				<i class="fa-sharp-duotone fa-solid fa-{alternative.icon} text-base-content/50 mt-0.5"></i>
				<span class="flex flex-1 flex-col items-start gap-1">
					<span class="font-medium">{alternative.title}</span>
					<span class="text-base-content/70 text-sm">{alternative.text}</span>
					<button
						class="btn btn-link btn-sm h-auto min-h-0 px-0"
						type="button"
						onclick={() => onSwitchPath(alternative.path)}
					>
						{alternative.action}
						<i class="fa-sharp-duotone fa-solid fa-arrow-right"></i>
					</button>
				</span>
			</div>
		{/each}
	</div>
	<button class="btn btn-primary mt-4 self-end" type="button" onclick={() => (understood = true)}>
		{m.next()}
		<i class="fa-sharp-duotone fa-solid fa-arrow-down"></i>
	</button>
</FlowStep>

{#if understood}
	<ApplicationTextsSteps
		firstNumber={3}
		schoolLabel={m.whichSchoolAreYouFrom()}
		motivationLabel={m.whyDoYouWantToJoinTheConference()}
		experienceLabel={m.howMuchExperienceDoesYourDelegationHave()}
		submitLabel={m.createDelegation()}
		submit={(answers) =>
			client.mutate.createDelegation({ __args: { ...answers, conferenceId }, id: true })}
	/>
{/if}
