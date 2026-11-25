<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import DashboardLinksGrid from '#lib/components/dashboard/DashboardLinksGrid.svelte';
	import DashboardLinkCard from '#lib/components/dashboard/DashboardLinkCard.svelte';
	import {
		getLinksForUserType,
		type DashboardLinkContext,
		type UserType
	} from '#lib/data/dashboardLinks';
	import getSimplifiedPostalStatus from '#lib/helpers/getSimplifiedPostalStatus';
	import type { MyConferenceParticipation } from '#lib/api/myConferenceParticipation';
	import LoadError from '#lib/components/LoadError.svelte';
	import NextEntries from './NextEntries.svelte';
	import PhoneReadyHint from './PhoneReadyHint.svelte';

	interface Props {
		conferenceId: string;
		userType: UserType;
		user: { sub: string; email: string };
		status: MyConferenceParticipation['participantStatus'];
		ofAgeAtConference: boolean;
		/** Role-specific context only the caller knows, such as whether a delegation has a nation. */
		extraContext?: Partial<DashboardLinkContext>;
	}

	let { conferenceId, userType, user, status, ofAgeAtConference, extraContext }: Props = $props();

	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: conferenceId },
			state: true,
			unlockPayments: true,
			unlockPostals: true,
			linkToPreparationGuide: true,
			isOpenPaperSubmission: true,
			showCalendar: true,
			linkToPaperInbox: true
		})
	);

	const linkContext = $derived<DashboardLinkContext>({
		conferenceId,
		userType,
		conferenceState: conference.state,
		unlockPayments: conference.unlockPayments,
		unlockPostals: conference.unlockPostals,
		linkToPreparationGuide: conference.linkToPreparationGuide,
		isOpenPaperSubmission: conference.isOpenPaperSubmission,
		showCalendar: conference.showCalendar,
		linkToPaperInbox: conference.linkToPaperInbox,
		paymentStatus: status?.paymentStatus,
		postalRegistrationStatus: getSimplifiedPostalStatus({
			participantStatus: status,
			ofAge: ofAgeAtConference
		}),
		user,
		...extraContext
	});

	const visibleLinks = $derived(getLinksForUserType({ userType, ctx: linkContext }));
</script>

{#snippet nextEntries()}
	<!-- A schedule that fails to load leaves the rest of the dashboard standing -->
	<svelte:boundary>
		<NextEntries {conferenceId} />
		{#snippet failed(_error, reset)}
			<LoadError onretry={reset} />
		{/snippet}
	</svelte:boundary>
{/snippet}

<!-- On site, where to be comes first; before that, what is left to do does -->
{#if conference.state === 'ACTIVE'}
	{@render nextEntries()}
{/if}

<PhoneReadyHint {conferenceId} conferenceState={conference.state} />

<DashboardSection
	icon="link"
	title={m.quickLinks()}
	description={m.quickLinksDescription()}
	tourAnchor="dashboard.quick-links"
>
	<DashboardLinksGrid>
		{#each visibleLinks as link (link.id)}
			{@const badge = link.getBadge?.(linkContext)}
			<DashboardLinkCard
				href={link.getHref(linkContext)}
				icon={link.icon}
				title={link.getTitle()}
				description={link.getDescription()}
				external={link.external}
				disabled={link.isDisabled(linkContext)}
				badge={badge?.value}
				badgeType={badge?.type}
				important={link.isImportant?.(linkContext) ?? false}
			>
				{#snippet info()}
					{@const Info = link.info}
					{#if Info}<Info {conferenceId} />{/if}
				{/snippet}
			</DashboardLinkCard>
		{/each}
	</DashboardLinksGrid>
</DashboardSection>

{#if conference.state === 'PREPARATION'}
	{@render nextEntries()}
{/if}
