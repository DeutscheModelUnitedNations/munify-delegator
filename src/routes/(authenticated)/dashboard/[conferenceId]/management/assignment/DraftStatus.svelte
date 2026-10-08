<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '$lib/api/rumbleClient/client';
	import { pendingCount } from '$lib/assignment/board';
	import { m } from '$lib/paraglide/messages';
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
		href={resolve('/(authenticated)/dashboard/[conferenceId]/management/assignment/finish', {
			conferenceId
		})}
	>
		<i class="fa-duotone fa-pen-ruler"></i>
		{m.assignmentPendingChanges({ count: pending })}
	</a>
	<!-- Where the release is switched: the conference's status settings. -->
	<a
		class="badge {conference.assignmentReleased ? 'badge-success' : 'badge-neutral'}"
		href={resolve('/(authenticated)/dashboard/[conferenceId]/management/configuration?tab=status', {
			conferenceId
		})}
		title={m.assignmentOpenReleaseSettings()}
	>
		<i class="fa-duotone {conference.assignmentReleased ? 'fa-eye' : 'fa-eye-slash'}"></i>
		{conference.assignmentReleased ? m.assignmentReleasedBadge() : m.assignmentHiddenBadge()}
	</a>
</div>
