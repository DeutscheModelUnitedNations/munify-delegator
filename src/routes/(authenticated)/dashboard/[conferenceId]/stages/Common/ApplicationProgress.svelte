<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { client } from '#lib/api/rumbleClient/client.js';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import StatusChecklist, {
		type ChecklistStatus
	} from '#lib/components/dashboard/StatusChecklist.svelte';

	/**
	 * Where an application stands: done, or what is still open before the deadline - each open
	 * step leading to the section it is done in - and the button that completes it.
	 */
	interface Props {
		conferenceId: string;
		applied: boolean;
		/** What still has to happen, shown while the application is incomplete. */
		pendingText: string;
		/** `href` points at the section of the page the step is done in. */
		steps: { task: string; done: boolean; hint?: string; href?: string }[];
		/** Unset when someone else completes the application (a delegation's ordinary members). */
		onComplete?: () => void;
	}

	let { conferenceId, applied, pendingText, steps, onComplete }: Props = $props();

	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: conferenceId },
			applicationDeadline: true,
			timezone: true
		})
	);

	const deadline = $derived(
		new Date(conference.applicationDeadline).toLocaleString(getLocale(), {
			timeZone: conference.timezone,
			dateStyle: 'full',
			timeStyle: 'short'
		})
	);

	const checklist = $derived(
		steps.map((step) => {
			const status: ChecklistStatus = step.done ? 'DONE' : 'PENDING';
			// A done step leads nowhere any more.
			return { task: step.task, status, hint: step.hint, href: step.done ? undefined : step.href };
		})
	);
	const allDone = $derived(steps.every((step) => step.done));
</script>

<DashboardSection icon="file-signature" title={m.yourApplication()}>
	{#if applied}
		<div role="status" class="alert bg-success/10 border-success/30 items-start">
			<i class="fa-sharp-duotone fa-solid fa-circle-check text-success mt-0.5 text-xl"></i>
			<div class="flex flex-col gap-1">
				<p class="font-semibold">{m.completeSignupSuccess()}</p>
				<p class="text-sm">{m.completeSignupSuccessDescription()}</p>
			</div>
		</div>
	{:else}
		<div class="flex flex-col gap-6">
			<div role="alert" class="alert bg-warning/10 border-warning/40 items-start">
				<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-warning mt-0.5 text-xl"
				></i>
				<div class="flex flex-col gap-1">
					<p class="font-semibold">{m.completeSignupWarningHeading()}</p>
					<p class="text-sm">{pendingText}</p>
					<p class="text-sm font-medium">
						<i class="fa-sharp-duotone fa-solid fa-clock mr-1"></i>
						{m.applicationDeadlineUntil({ deadline })}
					</p>
				</div>
			</div>

			<StatusChecklist steps={checklist} legend={false} />

			<div class="flex flex-col gap-2">
				{#if onComplete}
					<button class="btn btn-primary self-start" disabled={!allDone} onclick={onComplete}>
						<i class="fa-sharp-duotone fa-solid fa-paper-plane"></i>
						{m.completeSignupButton()}
					</button>
					{#if !allDone}
						<p class="text-base-content/60 text-sm">{m.completeSignupStepsOpen()}</p>
					{/if}
				{:else}
					<p class="text-base-content/60 text-sm">
						<i class="fa-sharp-duotone fa-solid fa-circle-info mr-1"></i>
						{m.completeSignupHeadDelegateOnly()}
					</p>
				{/if}
			</div>
		</div>
	{/if}
</DashboardSection>
