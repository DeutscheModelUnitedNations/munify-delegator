<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { ofAgeAtConference } from '#lib/helpers/ageChecker';
	import type { UserCardTab } from './userCardTabs';
	import { fetchStatusWithAge } from './tabs/participantStatus';

	/**
	 * The person's checklist for the conference, one pill per status: what is done, pending or a
	 * problem. A pill opens the tab where it is changed. Nothing without a participant row.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
		isConferenceSupervisor: boolean;
		onOpenTab: (tab: UserCardTab) => void;
	}

	let { userId, conferenceId, isConferenceSupervisor, onOpenTab }: Props = $props();

	type AdministrativeStatus = 'DONE' | 'PROBLEM' | 'PENDING';

	// The same row the formalities tab reads, so both share one cache record.
	const strip = $derived(await fetchStatusWithAge({ userId, conferenceId }));
	const status = $derived(strip.statuses.at(0));
	// Supervisors and adults sign for themselves
	const needsGuardian = $derived(
		!isConferenceSupervisor &&
			!ofAgeAtConference({
				startConference: strip.conference.startConference,
				dateOfBirth: strip.user.birthday
			})
	);

	type Tone = AdministrativeStatus | 'NONE';

	// Done is the normal case and stays quiet; only what still needs doing takes color.
	const tone: Record<Tone, { text: string; icon: string }> = {
		DONE: { text: 'text-base-content/70 [&>i]:text-success', icon: 'ph-check' },
		PENDING: { text: 'text-warning', icon: 'ph-hourglass-medium' },
		PROBLEM: { text: 'text-error', icon: 'ph-warning' },
		NONE: { text: 'text-base-content/40', icon: '' }
	};
</script>

{#snippet pill(title: string, value: Tone, icon: string, tab: UserCardTab, mono = false)}
	<button
		class="btn btn-ghost btn-xs shrink-0 gap-1.5 font-normal whitespace-nowrap {tone[value].text}"
		class:font-mono={mono}
		onclick={() => onOpenTab(tab)}
	>
		<i class="ph-duotone {icon}"></i>
		{title}
	</button>
{/snippet}

{#snippet administrative(title: string, value: AdministrativeStatus)}
	{@render pill(title, value, tone[value].icon, 'formalities')}
{/snippet}

{#if status}
	<div class="border-base-content/10 border-t pt-1.5 sm:pt-2">
		<!-- Pulled out by the buttons' padding, so their text lines up with the name above -->
		<!-- One line a phone scrolls sideways, rather than three that push the tabs down -->
		<div
			class="-mx-2 flex items-center gap-x-1 text-sm max-sm:overflow-x-auto sm:flex-wrap"
			data-vaul-no-drag
		>
			{@render administrative(m.payment(), status.paymentStatus)}
			{@render administrative(m.userAgreement(), status.termsAndConditions)}
			{#if needsGuardian}
				{@render administrative(m.guardianAgreement(), status.guardianConsent)}
			{/if}
			{@render administrative(m.mediaAgreement(), status.mediaConsent)}
			{@render pill(
				status.accessCardId ?? m.noAccessCard(),
				status.accessCardId ? 'DONE' : 'NONE',
				'ph-identification-card',
				'conference',
				!!status.accessCardId
			)}
			{@render pill(
				m.attendance(),
				status.didAttend ? 'DONE' : 'NONE',
				status.didAttend ? 'ph-calendar-check' : 'ph-calendar-blank',
				'conference'
			)}
		</div>
	</div>
{/if}
