<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import StatusRow, { type StatusOption } from '../sections/StatusRow.svelte';
	import AccessCardSection from '../AccessCardSection.svelte';
	import AttendanceSection from '../AttendanceSection.svelte';
	import { changeParticipantStatus, fetchParticipantStatus } from './participantStatus';

	/** The conference itself: the access card, and whether and where the person was there. */
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
</script>

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
