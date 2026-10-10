<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
	import DashboardLinksGrid from '$lib/components/dashboard/DashboardLinksGrid.svelte';
	import DashboardLinkCard from '$lib/components/dashboard/DashboardLinkCard.svelte';
	import {
		getLinksForUserType,
		type DashboardLinkContext,
		type UserType
	} from '$lib/data/dashboardLinks';
	import getSimplifiedPostalStatus from '$lib/helpers/getSimplifiedPostalStatus';
	import type { MyConferenceParticipation } from '$lib/api/myConferenceParticipation';

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
			info: true,
			linkToPreparationGuide: true,
			isOpenPaperSubmission: true,
			linkToPaperInbox: true
		})
	);

	const linkContext = $derived<DashboardLinkContext>({
		conferenceId,
		userType,
		conferenceState: conference.state,
		unlockPayments: conference.unlockPayments,
		unlockPostals: conference.unlockPostals,
		hasConferenceInfo: !!conference.info,
		linkToPreparationGuide: conference.linkToPreparationGuide,
		isOpenPaperSubmission: conference.isOpenPaperSubmission,
		linkToPaperInbox: conference.linkToPaperInbox,
		paymentStatus: status?.paymentStatus,
		postalRegistrationStatus: getSimplifiedPostalStatus(status, ofAgeAtConference),
		user,
		...extraContext
	});

	const visibleLinks = $derived(getLinksForUserType(userType, linkContext));
</script>

<DashboardSection icon="link" title={m.quickLinks()} description={m.quickLinksDescription()}>
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
			/>
		{/each}
	</DashboardLinksGrid>
</DashboardSection>
