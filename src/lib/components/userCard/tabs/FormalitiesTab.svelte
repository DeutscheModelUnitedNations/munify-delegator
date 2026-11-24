<script lang="ts">
	import { logger } from '#lib/logger';
	import { m } from '#lib/paraglide/messages';
	import ParticipantPaymentWidget from '#lib/components/ParticipantPaymentWidget.svelte';
	import AgreementDetails from '#lib/components/postal/AgreementDetails.svelte';
	import PostalScans from '#lib/components/postal/PostalScans.svelte';
	import CertificateSection from '../sections/CertificateSection.svelte';
	import FormalityRow from '../sections/FormalityRow.svelte';
	import DocumentNumberRow from '../sections/DocumentNumberRow.svelte';
	import { toast } from 'svelte-sonner';
	import {
		downloadPostalRegistrationDocuments,
		fetchPostalRegistrationSources
	} from '#lib/api/postalRegistrationSources';
	import { postalRecipient } from '#lib/api/postalRegistrationData';
	import { careTeamPostalParticipant, documentFileName, hasPostalAddress } from './statusDownloads';
	import { formalitiesOf, needsGuardian } from '../formalities';
	import {
		changeParticipantStatus,
		fetchStatusWithAge,
		type StatusChange
	} from './participantStatus';

	/**
	 * What has to be settled before the conference: payment and the signed agreements with their
	 * buttons, beside them the papers behind them, what is rarely needed folded.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
		isConferenceSupervisor: boolean;
	}

	let { userId, conferenceId, isConferenceSupervisor }: Props = $props();

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
	const formalities = $derived(formalitiesOf({ status, needsGuardian: guardian }));

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

<div class="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
	<section class="flex min-w-0 flex-col gap-3">
		<h3 class="text-lg font-bold">{m.userCardStatuses()}</h3>
		<div class="bg-base-200 rounded-box divide-base-300 flex flex-col divide-y py-1">
			{#each formalities as formality (formality.key)}
				<FormalityRow formality={formality.key} {status} {change} />
			{/each}
			{#if !isConferenceSupervisor && !guardian}
				<p class="text-base-content/60 flex items-center gap-3 px-4 py-2 text-sm">
					<i aria-hidden="true" class="ph-duotone ph-shield-check w-5 text-center"></i>
					<span>{m.guardianAgreement()}: {m.guardianAgreementNotNeeded()}</span>
				</p>
			{/if}
		</div>
		{#if !status}
			<div class="alert alert-info">
				<i aria-hidden="true" class="ph-duotone ph-info"></i>
				<span>{m.noParticipantStatusYet()}</span>
			</div>
		{/if}
	</section>

	<section class="flex min-w-0 flex-col gap-3">
		<h3 class="text-lg font-bold">{m.userCardDocuments()}</h3>
		<div class="bg-base-200 rounded-box divide-base-300 flex flex-col divide-y py-1">
			<DocumentNumberRow
				assignedDocumentNumber={status?.assignedDocumentNumber ?? undefined}
				onSave={(number) =>
					change({ assignedDocumentNumber: number, assignNextDocumentNumber: !number })}
			/>
			<ParticipantPaymentWidget {userId} {conferenceId} />
			{#if statusId}
				<PostalScans {conferenceId} {userId} conferenceParticipantId={statusId} />
				<AgreementDetails conferenceParticipantId={statusId} />
			{/if}
			<CertificateSection {userId} {conferenceId} />
		</div>
		<button class="btn btn-sm self-start" onclick={downloadPostalDocs}>
			<i aria-hidden="true" class="ph-duotone ph-file-pdf"></i>
			{m.downloadPostalDocuments()}
		</button>
	</section>
</div>
