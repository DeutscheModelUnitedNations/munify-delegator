<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { untrack } from 'svelte';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import DelegationPreview from '#lib/components/DelegationPreview.svelte';
	import { createEntryCodeInput } from '#lib/helpers/entryCodeInput.svelte.js';
	import FlowStep from './FlowStep.svelte';
	import CreateDelegationSteps from './CreateDelegationSteps.svelte';
	import IndividualSteps from './IndividualSteps.svelte';
	import SupervisorSteps from './SupervisorSteps.svelte';
	import type { ApplyPath } from './applyPaths';
	import { setFlowInteraction } from './flowInteraction';

	/**
	 * The whole application as one form down the page: how to take part first, then the steps of
	 * that path, each opening below the one before. Submitting the last step registers the caller,
	 * and the dashboard around it turns into their application.
	 */
	interface Props {
		conferenceId: string;
		/** Where an old registration link pointed: the path, the entry code, the role. */
		initialPath?: ApplyPath;
		initialCode?: string;
		initialRoleId?: string;
		/** Delegates and supervisors cannot also apply alone. */
		individualBlocked: boolean;
	}

	let { conferenceId, initialPath, initialCode, initialRoleId, individualBlocked }: Props =
		$props();

	// Seeded once: a link naming another path remounts the form (the dashboard keys it by the link).
	let path = $state<ApplyPath | undefined>(untrack(() => initialPath));
	const code = createEntryCodeInput(untrack(() => initialCode ?? ''));

	// Set by the first click or key press inside the form, after which opened steps scroll to view.
	let started = $state(false);
	setFlowInteraction({
		get started() {
			return started;
		}
	});

	const options = $derived([
		{
			path: 'createDelegation' as const,
			icon: 'plus',
			title: m.createDelegation(),
			description: m.createDelegationDescription(),
			disabled: false
		},
		{
			path: 'joinDelegation' as const,
			icon: 'right-to-bracket',
			title: m.joinDelegation(),
			description: m.joinDelegationDescription(),
			disabled: false
		},
		{
			path: 'individual' as const,
			icon: 'envelope',
			title: m.individualApplication(),
			description: m.individualApplicationDescription(),
			disabled: individualBlocked
		},
		{
			path: 'supervisor' as const,
			icon: 'chalkboard-user',
			title: m.supervisor(),
			description: m.applyAsSupervisorDescription(),
			disabled: false
		}
	]);
	const chosen = $derived(options.find((option) => option.path === path));
</script>

<ol
	class="flex flex-col"
	onclickcapture={() => (started = true)}
	onkeydowncapture={() => (started = true)}
>
	<FlowStep
		number={1}
		title={m.registrationStepChoosePath()}
		summary={chosen?.title}
		onEdit={() => (path = undefined)}
		last={!chosen}
		bare
	>
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{#each options as option, index (option.path)}
				<button
					type="button"
					class="card bg-base-200 group text-left transition-all duration-200 enabled:hover:-translate-y-1 enabled:hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
					disabled={option.disabled}
					onclick={() => (path = option.path)}
					in:fly={{ y: 16, duration: 350, delay: 60 * index, easing: cubicOut }}
				>
					<span class="card-body gap-3">
						<span class="flex items-center gap-3">
							<span
								class="bg-primary/10 text-primary group-enabled:group-hover:bg-primary group-enabled:group-hover:text-primary-content rounded-box flex size-10 shrink-0 items-center justify-center text-lg transition-colors duration-200"
							>
								<i class="fa-sharp-duotone fa-solid fa-{option.icon}"></i>
							</span>
							<span class="card-title text-base">{option.title}</span>
						</span>
						<span class="text-base-content/70 flex-1 text-sm">{option.description}</span>
						{#if option.disabled}
							<span class="badge badge-ghost">{m.RegistrationNotPossible()}</span>
						{:else}
							<i
								class="fa-sharp-duotone fa-solid fa-arrow-down text-primary self-end transition-transform duration-200 group-hover:translate-y-1"
							></i>
						{/if}
					</span>
				</button>
			{/each}
		</div>
	</FlowStep>

	{#if path === 'createDelegation'}
		<CreateDelegationSteps {conferenceId} onSwitchPath={(next) => (path = next)} />
	{:else if path === 'individual'}
		<IndividualSteps {conferenceId} {initialRoleId} />
	{:else if path === 'joinDelegation'}
		<FlowStep
			number={2}
			title={m.enterCode()}
			description={m.pleaseCheckDelegation()}
			last
			scrollIntoView
		>
			<input
				type="text"
				placeholder="Code"
				bind:value={code.value}
				aria-label={m.enterCode()}
				class="input input-lg mb-4 w-full max-w-xs font-mono tracking-[0.8rem] uppercase"
			/>
			{#if code.ready}
				<div in:fly={{ y: 16, duration: 300 }}>
					<DelegationPreview {conferenceId} entryCode={code.ready} />
				</div>
			{/if}
		</FlowStep>
	{:else if path === 'supervisor'}
		<SupervisorSteps {conferenceId} firstNumber={2} />
	{/if}
</ol>
