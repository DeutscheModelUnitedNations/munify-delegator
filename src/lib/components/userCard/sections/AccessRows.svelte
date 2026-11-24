<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import AccessCardSection from '../AccessCardSection.svelte';
	import StatusRow, { type StatusOption } from './StatusRow.svelte';
	import {
		changeParticipantStatus,
		fetchParticipantStatus,
		notifyBadgeFound,
		type StatusChange
	} from '../tabs/participantStatus';

	/** Whether the person is at the conference, and their access card, as rows of a list. */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const statuses = $derived(await fetchParticipantStatus({ userId, conferenceId }));
	const status = $derived(statuses.at(0));
	const statusId = $derived(status?.id);

	// Not being there is the normal case until the conference, so it takes no color
	const attendanceOptions: StatusOption<boolean>[] = [
		{ value: false, label: m.absent(), icon: 'x', tone: 'neutral' },
		{ value: true, label: m.present(), icon: 'check', tone: 'success' }
	];

	const change = (input: StatusChange) =>
		changeParticipantStatus({ target: { id: statusId, conferenceId, userId }, input });
</script>

<StatusRow
	title={m.attendance()}
	icon="calendar-check"
	active={status?.didAttend ?? false}
	options={attendanceOptions}
	change={(didAttend) => change({ didAttend })}
/>
<AccessCardSection
	accessCardId={status?.accessCardId}
	onSave={(accessCardId) => change({ accessCardId })}
	onNotifyFound={statusId ? () => notifyBadgeFound(statusId) : undefined}
/>
