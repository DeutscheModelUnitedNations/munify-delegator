<script lang="ts">
	import { SIGHTING_STATUSES, type SightingStatus } from './sighting';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { searchSchools } from './applications';

	/** The status and school filters of the sighting. */
	interface Props {
		status: SightingStatus;
		/** The school filtered by, `''` for the people without one, `null` for every school */
		schoolId: string | null;
		conferenceId: string;
		onStatus: (status: string) => void;
		onSchool: (schoolId: string | null) => void;
	}

	let { status, schoolId, conferenceId, onStatus, onSchool }: Props = $props();

	// Thousands of schools do not fit a select: the box asks the backend for the ones matching.
	let typed = $state('');
	let query = $state('');
	$effect(() => {
		const next = typed;
		const timer = setTimeout(() => (query = next), 250);
		return () => clearTimeout(timer);
	});
	const schools = $derived(await searchSchools({ conferenceId, search: query }));
	const chosen = $derived(
		schoolId ? await client.liveQuery.school({ __args: { id: schoolId }, name: true }) : null
	);
	const chosenName = $derived(schoolId === '' ? m.assignmentNoSchool() : (chosen?.name ?? ''));

	function choose(id: string) {
		typed = '';
		onSchool(id);
		if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
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
<div class="dropdown">
	<label class="input w-auto max-w-xs">
		<i class="fa-sharp-duotone fa-solid fa-school opacity-60"></i>
		<input
			type="search"
			aria-label={m.school()}
			placeholder={schoolId === null ? m.assignmentAllSchools() : chosenName}
			bind:value={typed}
		/>
	</label>
	<ul
		tabindex="-1"
		class="dropdown-content menu bg-base-100 rounded-box border-base-300 z-10 mt-1 max-h-80 w-80 flex-nowrap overflow-y-auto border p-2 shadow-lg"
	>
		{#each schools as option (option.schoolId ?? '')}
			<li>
				<button type="button" onclick={() => choose(option.schoolId ?? '')}>
					<span class="min-w-0 flex-1 truncate">
						{option.school || m.assignmentNoSchool()}
						{#if option.city}
							<span class="text-base-content/60">· {option.city}</span>
						{/if}
					</span>
					<span class="text-base-content/60 text-xs">{option.applications} / {option.people}</span>
				</button>
			</li>
		{/each}
	</ul>
</div>
{#if schoolId !== null}
	<button
		class="btn btn-ghost btn-sm"
		onclick={() => {
			typed = '';
			onSchool(null);
		}}
	>
		<i class="fa-sharp-duotone fa-solid fa-xmark"></i>
		{chosenName}
	</button>
{/if}
