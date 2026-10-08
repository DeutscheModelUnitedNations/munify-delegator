<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '$lib/api/rumbleClient/client';
	import { pendingCount } from '$lib/assignment/board';
	import { m } from '$lib/paraglide/messages';
	import { draftApplicationIds, fetchAssignmentDraft, fetchSeatedApplications } from './board';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const [draft, conference] = $derived(
		await Promise.all([
			fetchAssignmentDraft(conferenceId),
			client.liveQuery.conference({ __args: { id: conferenceId }, assignmentReleased: true })
		])
	);
	const touched = $derived(draftApplicationIds(draft));
	const seated = $derived(await fetchSeatedApplications(conferenceId, touched));

	const pending = $derived(pendingCount({ ...draft, ...seated }));
</script>

<a
	class="flex flex-wrap items-center gap-2"
	href={resolve('/(authenticated)/dashboard/[conferenceId]/management/assignment/finish', {
		conferenceId
	})}
>
	<span class="badge {pending > 0 ? 'badge-warning' : 'badge-ghost'}">
		<i class="fa-duotone fa-pen-ruler"></i>
		{m.assignmentPendingChanges({ count: pending })}
	</span>
	<span class="badge {conference.assignmentReleased ? 'badge-success' : 'badge-neutral'}">
		<i class="fa-duotone {conference.assignmentReleased ? 'fa-eye' : 'fa-eye-slash'}"></i>
		{conference.assignmentReleased ? m.assignmentReleasedBadge() : m.assignmentHiddenBadge()}
	</span>
</a>
