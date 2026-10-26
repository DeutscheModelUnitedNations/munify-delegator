<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { ofAgeAtConference } from '#lib/helpers/ageChecker.js';
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
	const strip = $derived(await fetchStatusWithAge(userId, conferenceId));
	const status = $derived(strip.statuses.at(0));
	// Supervisors and adults sign for themselves
	const needsGuardian = $derived(
		!isConferenceSupervisor &&
			!ofAgeAtConference(strip.conference.startConference, strip.user.birthday)
	);

	const tone: Record<AdministrativeStatus, { badge: string; icon: string }> = {
		DONE: { badge: 'badge-success', icon: 'fa-check' },
		PENDING: { badge: 'badge-warning', icon: 'fa-hourglass-half' },
		PROBLEM: { badge: 'badge-error', icon: 'fa-triangle-exclamation' }
	};
</script>

{#snippet pill(title: string, badge: string, icon: string, tab: UserCardTab)}
	<button class="badge badge-soft cursor-pointer gap-1.5 {badge}" onclick={() => onOpenTab(tab)}>
		<i class="fa-sharp-duotone fa-solid {icon} text-xs"></i>
		{title}
	</button>
{/snippet}

{#snippet administrative(title: string, value: AdministrativeStatus)}
	{@render pill(title, tone[value].badge, tone[value].icon, 'formalities')}
{/snippet}

{#if status}
	<div class="flex flex-wrap items-center gap-2 text-sm">
		{@render administrative(m.payment(), status.paymentStatus)}
		{@render administrative(m.userAgreement(), status.termsAndConditions)}
		{#if needsGuardian}
			{@render administrative(m.guardianAgreement(), status.guardianConsent)}
		{/if}
		{@render administrative(m.mediaAgreement(), status.mediaConsent)}
		{@render pill(
			status.accessCardId ?? m.noAccessCard(),
			status.accessCardId ? 'badge-success font-mono' : 'badge-neutral',
			'fa-id-card',
			'conference'
		)}
		{@render pill(
			m.attendance(),
			status.didAttend ? 'badge-success' : 'badge-neutral',
			status.didAttend ? 'fa-calendar-check' : 'fa-calendar',
			'conference'
		)}
	</div>
{/if}
