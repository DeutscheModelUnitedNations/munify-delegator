<script lang="ts">
	import { SIGHTING_STATUSES, type SightingStatus } from '$lib/assignment/sighting';
	import { m } from '$lib/paraglide/messages';

	/** The status and school filters of the sighting. */
	interface Props {
		status: SightingStatus;
		school: string | null;
		schools: { school: string; applications: number; people: number }[];
		onStatus: (status: string) => void;
		onSchool: (school: string | null) => void;
	}

	let { status, school, schools, onStatus, onSchool }: Props = $props();

	const statusLabels: Record<SightingStatus, string> = {
		all: m.assignmentStatusAll(),
		unrated: m.assignmentStatusUnrated(),
		rated: m.assignmentStatusRated(),
		flagged: m.assignmentStatusFlagged(),
		disqualified: m.assignmentStatusDisqualified(),
		noted: m.assignmentStatusNoted()
	};
</script>

<select
	class="select w-auto"
	aria-label={m.assignmentStatusFilter()}
	value={status}
	onchange={(e) => onStatus(e.currentTarget.value)}
>
	{#each SIGHTING_STATUSES as option (option)}
		<option value={option}>{statusLabels[option]}</option>
	{/each}
</select>
<select
	class="select w-auto max-w-xs"
	aria-label={m.school()}
	value={school ?? ''}
	onchange={(e) => onSchool(e.currentTarget.value || null)}
>
	<option value="">{m.assignmentAllSchools()}</option>
	{#each schools as option (option.school)}
		<option value={option.school}>
			{option.school || m.assignmentNoSchool()} ({option.applications} / {option.people})
		</option>
	{/each}
</select>
