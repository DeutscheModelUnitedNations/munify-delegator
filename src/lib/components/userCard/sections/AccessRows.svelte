<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import AccessCardSection from '../AccessCardSection.svelte';
	import Row from '../ui/Row.svelte';
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
	const didAttend = $derived(status?.didAttend ?? false);

	const change = (input: StatusChange) =>
		changeParticipantStatus({ target: { id: statusId, conferenceId, userId }, input });
</script>

<Row icon="calendar-check" title={m.participation()}>
	{didAttend ? m.userCardParticipated() : m.userCardNotParticipated()}
	{#snippet actions()}
		<input
			type="checkbox"
			class="toggle toggle-success"
			aria-label={m.userCardParticipated()}
			checked={didAttend}
			onchange={() => change({ didAttend: !didAttend })}
		/>
	{/snippet}
</Row>
<AccessCardSection
	accessCardId={status?.accessCardId}
	onSave={(accessCardId) => change({ accessCardId })}
	onNotifyFound={statusId ? () => notifyBadgeFound(statusId) : undefined}
/>
