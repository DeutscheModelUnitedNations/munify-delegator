<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { pendingCount } from '#lib/assignment/board.js';
	import { m } from '#lib/paraglide/messages.js';
	import { fetchAssignmentDraft, fetchSeatedApplications, seatedSnapshot } from './board';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const [draft, seated, conference] = $derived(
		await Promise.all([
			fetchAssignmentDraft(conferenceId),
			fetchSeatedApplications(conferenceId),
			client.liveQuery.conference({ __args: { id: conferenceId }, assignmentReleased: true })
		])
	);
	const plain = seatedSnapshot();
	const rows = $derived(plain(draft, seated));
	const pending = $derived(pendingCount(rows));
</script>

<div class="flex flex-wrap items-center gap-2">
	<a
		class="badge {pending > 0 ? 'badge-warning' : 'badge-ghost'}"
		href={resolve('/(authenticated)/dashboard/[conferenceId]/team/assignment/finish', {
			conferenceId
		})}
	>
		<i class="fa-sharp-duotone fa-solid fa-pen-ruler"></i>
		{m.assignmentPendingChanges({ count: pending })}
	</a>
	<span class="badge {conference.assignmentReleased ? 'badge-success' : 'badge-neutral'}">
		<i class="fa-sharp-duotone fa-solid {conference.assignmentReleased ? 'fa-eye' : 'fa-eye-slash'}"
		></i>
		{conference.assignmentReleased ? m.assignmentReleasedBadge() : m.assignmentHiddenBadge()}
	</span>
</div>
