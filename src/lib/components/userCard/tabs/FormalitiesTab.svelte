<script lang="ts">
	import { logger } from '#lib/logger';
	import { m } from '#lib/paraglide/messages';
	import ParticipantPaymentWidget from '#lib/components/ParticipantPaymentWidget.svelte';
	import AgreementDetails from '#lib/components/postal/AgreementDetails.svelte';
	import PostalScans from '#lib/components/postal/PostalScans.svelte';
	import AccessPanel from '../sections/AccessPanel.svelte';
	import FormalityRow from '../sections/FormalityRow.svelte';
	import Empty from '../ui/Empty.svelte';
	import Section from '../ui/Section.svelte';
	import { CARD_COLUMNS } from '../ui/columns';
	import DocumentNumberRow from '../sections/DocumentNumberRow.svelte';
	import { toast } from 'svelte-sonner';
	import {
		downloadPostalRegistrationDocuments,
		fetchPostalRegistrationSources
	} from '#lib/api/postalRegistrationSources';
	import { postalRecipient } from '#lib/api/postalRegistrationData';
	import { careTeamPostalParticipant, documentFileName, hasPostalAddress } from './statusDownloads';
	import { formalitiesOf, needsGuardian, postalProgress } from '../formalities';
	import {
		changeParticipantStatus,
		fetchStatusWithAge,
		type StatusChange
	} from './participantStatus';

	/**
	 * What has to be settled with the person, one column per topic: the payment, the signed papers, and
	 * them at the conference, which comes first once it runs. What is rarely needed is folded.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
		isConferenceSupervisor: boolean;
		/** A confirmed place at the conference, which the access card and attendance go with */
		access: boolean;
		/** The conference runs or is over, so letting the person in comes first */
		onSite: boolean;
	}

	let { userId, conferenceId, isConferenceSupervisor, access, onSite }: Props = $props();

	const data = $derived(await fetchStatusWithAge({ userId, conferenceId }));
	const status = $derived(data.statuses.at(0));
	const statusId = $derived(status?.id);
	const guardian = $derived(
		needsGuardian({
			isConferenceSupervisor,
			birthday: data.user.birthday,
			startConference: data.conference.startConference
		})
	);
	const postal = $derived(postalProgress(formalitiesOf({ status, needsGuardian: guardian })));

	const change = (input: StatusChange) =>
		changeParticipantStatus({ target: { id: statusId, conferenceId, userId }, input });

	/** Everything the postal documents need is read when they are asked for, not kept live. */
	const downloadPostalDocs = async () => {
		try {
			const { user, conference, issueCodes } = await fetchPostalRegistrationSources({
				userId,
				conferenceId
			});
			if (!hasPostalAddress(conference)) {
				toast.error(m.httpGenericError());
				return;
			}
			const postal = careTeamPostalParticipant(user);
			if (!postal) {
				toast.error(m.httpMissingRequiredData());
				return;
			}
			await downloadPostalRegistrationDocuments({
				conference,
				birthday: postal.birthday,
				participant: postal.participant,
				issueCodes,
				recipient: postalRecipient(conference),
				fileName: documentFileName({ user, document: 'postal_registration' })
			});
		} catch (error) {
			logger.error('Error generating PDF', error);
			toast.error(m.httpGenericError());
		}
	};
</script>

{#snippet onSiteSection()}
	{#if access && status}
		<AccessPanel {userId} {conferenceId} />
	{/if}
{/snippet}

{#snippet paymentSection()}
	<Section icon="money" title={m.userCardPayment()}>
		<FormalityRow formality="paymentStatus" {status} {change} />
		<ParticipantPaymentWidget {userId} {conferenceId} />
		{#if !status}
			<Empty icon="info" text={m.noParticipantStatusYet()} />
		{/if}
	</Section>
{/snippet}

{#snippet postalSection()}
	<Section
		icon="envelope-open"
		title={m.postalRegistration()}
		subtitle={m.userCardDoneOf({ count: postal.done, total: postal.total })}
	>
		<FormalityRow formality="termsAndConditions" {status} {change} />
		{#if guardian}
			<FormalityRow formality="guardianConsent" {status} {change} />
		{/if}
		<FormalityRow formality="mediaConsent" {status} {change} />
		<DocumentNumberRow
			assignedDocumentNumber={status?.assignedDocumentNumber ?? undefined}
			onSave={(number) =>
				change({ assignedDocumentNumber: number, assignNextDocumentNumber: !number })}
		/>
		{#if statusId}
			<PostalScans {conferenceId} {userId} conferenceParticipantId={statusId} />
		{/if}
		<!-- Its icon below the texts of the rows -->
		<div class="pt-1 pl-6">
			<button class="btn btn-sm btn-ghost text-primary" onclick={downloadPostalDocs}>
				<i aria-hidden="true" class="ph-duotone ph-download-simple text-lg"></i>
				{m.userCardDownloadDocuments()}
			</button>
		</div>
	</Section>
{/snippet}

<!-- Where only two columns fit, the first two sections share one -->
<div class={[CARD_COLUMNS, 'gap-y-6']}>
	<div class="flex min-w-0 flex-col gap-6 group-data-wide/card:min-[1760px]:contents">
		{#if onSite}
			{@render onSiteSection()}
			{@render paymentSection()}
		{:else}
			{@render paymentSection()}
			{@render postalSection()}
		{/if}
	</div>
	{#if onSite}
		{@render postalSection()}
	{:else}
		{@render onSiteSection()}
	{/if}
	{#if statusId}
		<!-- Across the columns, as its many lines stand beside each other once it is unfolded -->
		<div class="border-base-content/15 col-span-full min-w-0 border-t pt-3">
			<AgreementDetails conferenceParticipantId={statusId} />
		</div>
	{/if}
</div>
