<script lang="ts">
	import { SIGHTING_STATUSES, type SightingStatus } from '$lib/assignment/sighting';
	import { m } from '$lib/paraglide/messages';
	import { searchSchools } from './applications';

	/** The status and school filters of the sighting. */
	interface Props {
		status: SightingStatus;
		school: string | null;
		conferenceId: string;
		onStatus: (status: string) => void;
		onSchool: (school: string | null) => void;
	}

	let { status, school, conferenceId, onStatus, onSchool }: Props = $props();

	// Thousands of schools do not fit a select: the box asks the backend for the ones matching.
	let typed = $state('');
	let query = $state('');
	$effect(() => {
		const next = typed;
		const timer = setTimeout(() => (query = next), 250);
		return () => clearTimeout(timer);
	});
	const schools = $derived(await searchSchools(conferenceId, query));
	const listId = $props.id();

	function choose(value: string) {
		const match = schools.find((option) => option.school === value);
		if (match) onSchool(match.school);
	}

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
<label class="input w-auto max-w-xs">
	<i class="fa-duotone fa-school opacity-60"></i>
	<input
		type="search"
		list={listId}
		aria-label={m.school()}
		placeholder={school === null ? m.assignmentAllSchools() : school || m.assignmentNoSchool()}
		bind:value={typed}
		oninput={(e) => choose(e.currentTarget.value)}
	/>
	<datalist id={listId}>
		{#each schools as option (option.school)}
			<option value={option.school}>
				{option.applications} / {option.people}
			</option>
		{/each}
	</datalist>
</label>
{#if school !== null}
	<button
		class="btn btn-ghost btn-sm"
		onclick={() => {
			typed = '';
			onSchool(null);
		}}
	>
		<i class="fa-duotone fa-xmark"></i>
		{school || m.assignmentNoSchool()}
	</button>
{/if}
