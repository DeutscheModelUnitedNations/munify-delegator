<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { client } from '#lib/api/rumbleClient/client.js';
	import StatusRow, { type StatusOption } from '../sections/StatusRow.svelte';
	import AccessCardSection from '../AccessCardSection.svelte';
	import AttendanceSection from '../AttendanceSection.svelte';
	import { toast } from 'svelte-sonner';
	import { downloadCompleteCertificate } from '#lib/utils/pdfGenerator.js';
	import { resolveDocumentLayout } from '#lib/helpers/documentLayout.js';
	import { certificateContentsOf, documentFileName } from './statusDownloads';
	import { changeParticipantStatus, fetchParticipantStatus } from './participantStatus';

	/** The conference itself: the access card, whether and where the person was there, the certificate. */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const statuses = $derived(await fetchParticipantStatus(userId, conferenceId));
	const status = $derived(statuses.at(0));
	const statusId = $derived(status?.id);

	const attendanceOptions: StatusOption<boolean>[] = [
		{ value: false, label: m.absent(), faIcon: 'xmark', tone: 'error' },
		{ value: true, label: m.present(), faIcon: 'check', tone: 'success' }
	];

	const downloadCertificate = async () => {
		try {
			const [conferenceData, jwtData, user] = await Promise.all([
				client.query.conference({
					__args: { id: conferenceId },
					certificateFile: { url: true },
					documentLayouts: true,
					title: true
				}),
				client.query.getCertificateJWT({
					__args: { conferenceId, userId },
					jwt: true,
					fullName: true,
					sessions: { name: true, attended: true }
				}),
				client.query.user({ __args: { id: userId }, id: true, givenName: true, familyName: true })
			]);
			const certificate = certificateContentsOf(jwtData);
			if (!certificate) {
				toast.error(m.certificateDownloadError());
				return;
			}
			await downloadCompleteCertificate(
				certificate,
				conferenceData.certificateFile?.url,
				documentFileName(user, 'certificate'),
				resolveDocumentLayout('certificate', conferenceData.documentLayouts)
			);
		} catch (error) {
			console.error('Error generating PDF:', error);
			toast.error(m.certificateDownloadError());
		}
	};
</script>

<div class="flex flex-col gap-6">
	<section class="flex flex-col gap-3">
		<h3 class="text-lg font-bold">{m.accessAndAttendance()}</h3>
		<div class="bg-base-200 rounded-box divide-base-300 flex flex-col divide-y">
			<StatusRow
				title={m.attendance()}
				faIcon="calendar-check"
				active={status?.didAttend ?? false}
				options={attendanceOptions}
				change={(didAttend) =>
					changeParticipantStatus({ id: statusId, conferenceId, userId }, { didAttend })}
			/>
			<AccessCardSection
				accessCardId={status?.accessCardId}
				onSave={(accessCardId) =>
					changeParticipantStatus({ id: statusId, conferenceId, userId }, { accessCardId })}
			/>
			<AttendanceSection {userId} {conferenceId} />
		</div>
	</section>

	<section class="flex flex-col gap-3">
		<h3 class="text-lg font-bold">{m.certificate()}</h3>
		<div class="bg-base-200 rounded-box flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
			<i
				class="fa-sharp-duotone fa-solid fa-certificate text-base-content/60 w-6 text-center text-lg"
			></i>
			<span class="grow font-semibold">{m.certificate()}</span>
			<button class="btn btn-sm" onclick={downloadCertificate}>
				<i class="fa-sharp-duotone fa-solid fa-download"></i>
				{m.downloadCertificate()}
			</button>
		</div>
	</section>
</div>
