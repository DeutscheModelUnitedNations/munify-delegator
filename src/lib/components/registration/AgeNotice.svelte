<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { ageNoticeText } from '#lib/helpers/ageRangeText';
	import type { AgeRole } from '#lib/helpers/plausibilityRules';

	/**
	 * Warns the signed-in person when their age on the first conference day misses the conference's
	 * range for `role` (`myAgeNotice`). They may still register, but a participant's application
	 * cannot be sent with it (`blocksApplication`); otherwise the team decides. Renders nothing when
	 * the age fits or no birthday is known.
	 */
	interface Props {
		conferenceId: string;
		role: AgeRole;
		/** Already registered (the dashboard) rather than about to apply. */
		entered?: boolean;
		/** The notice is about an application yet to be sent, which the age keeps from being sent. */
		blocksApplication?: boolean;
		/** Offered to a participant old enough to supervise, to switch to that path. */
		onApplyAsSupervisor?: () => void;
		/** Spacing around the notice, only there while it is shown. */
		class?: string;
	}

	let {
		conferenceId,
		role,
		entered = false,
		blocksApplication = false,
		onApplyAsSupervisor,
		class: className = ''
	}: Props = $props();

	const notice = $derived(
		await client.query.myAgeNotice({
			__args: { conferenceId, role },
			issue: true,
			age: true,
			participantMinAge: true,
			participantMaxAge: true,
			supervisorMinAge: true
		})
	);

	const text = $derived(notice ? ageNoticeText(notice) : undefined);
	const suggestSupervisor = $derived(notice?.issue === 'shouldBeSupervisor');
</script>

{#if text}
	<div
		role="status"
		class="alert alert-warning alert-soft items-start {className}"
		data-testid="age-notice"
	>
		<i aria-hidden="true" class="ph-duotone ph-cake mt-0.5 text-xl"></i>
		<div class="flex flex-col gap-1">
			<h2 class="font-semibold">{m.ageNoticeTitle()}</h2>
			<p class="text-sm">
				{text}
				{#if suggestSupervisor}{m.ageNoticeBecomeSupervisor()}{/if}
				{#if blocksApplication}
					{m.ageNoticeBlocksApplication()}
				{:else}
					{entered ? m.ageNoticeAfterEntering() : m.ageNoticeBeforeEntering()}
				{/if}
			</p>
			{#if suggestSupervisor && onApplyAsSupervisor}
				<button
					type="button"
					class="btn btn-sm btn-warning mt-1 self-start"
					onclick={onApplyAsSupervisor}
				>
					<i aria-hidden="true" class="ph-duotone ph-chalkboard-teacher"></i>
					{m.ageNoticeApplyAsSupervisor()}
				</button>
			{/if}
		</div>
	</div>
{/if}
