<script lang="ts">
	import { logger } from '#lib/logger';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import type { ManagedColumn } from '#lib/components/tanStackTable/managedTable';
	import { toast } from 'svelte-sonner';
	import ManagedTable from '#lib/components/tanStackTable/ui/ManagedTable.svelte';
	import hotkeys from 'hotkeys-js';
	import { onDestroy, onMount } from 'svelte';
	import SchoolSuggestions from './SchoolSuggestions.svelte';
	import Kbd from '#lib/components/Kbd.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const schoolSelection = {
		schoolId: true,
		school: true,
		delegationCount: true,
		delegationMembers: true,
		singleParticipants: true,
		sumParticipants: true
	} as const;

	function fetchSchools() {
		return client.query.conference({
			__args: { id: conferenceId },
			id: true,
			schools: schoolSelection
		});
	}

	type SchoolRow = Awaited<ReturnType<typeof fetchSchools>>['schools'][number];

	let schoolsLoading = $state(true);
	let normalizing = $state(false);
	let loadedSchools = $state<SchoolRow[]>([]);

	async function loadSchools() {
		try {
			const conference = await fetchSchools();
			loadedSchools = conference.schools;
		} finally {
			schoolsLoading = false;
		}
	}

	$effect(() => {
		if (conferenceId) void loadSchools();
	});

	/** A school picked for merging. */
	type PickedSchool = { id: string; name: string };

	let newSchoolName = $state('');
	let selectedSchools = $state<PickedSchool[]>([]);

	const schools = $derived(loadedSchools);
	const isSelected = (id: string) => selectedSchools.some((school) => school.id === id);

	$effect(() => {
		if (selectedSchools.length === 1) {
			newSchoolName = selectedSchools[0].name;
		}
	});

	const columns: ManagedColumn<SchoolRow>[] = [
		{
			id: 'school',
			header: m.cleanupNormalizeSchoolsColumnSchool(),
			accessorFn: (row) => row.school
		},
		{
			id: 'delegationCount',
			header: m.cleanupNormalizeSchoolsColumnDelegations(),
			accessorFn: (row) => row.delegationCount
		},
		{
			id: 'delegationMembers',
			header: m.cleanupNormalizeSchoolsColumnDelegationMembers(),
			accessorFn: (row) => row.delegationMembers
		},
		{
			id: 'singleParticipants',
			header: m.singleParticipants(),
			accessorFn: (row) => row.singleParticipants
		},
		{
			id: 'sumParticipants',
			header: m.cleanupNormalizeSchoolsColumnTotalParticipants(),
			accessorFn: (row) => row.sumParticipants
		}
	];

	const columnClasses = Object.fromEntries(
		['delegationCount', 'delegationMembers', 'singleParticipants', 'sumParticipants'].map((id) => [
			id,
			'text-center'
		])
	);

	function toggleSchool(row: SchoolRow) {
		selectedSchools = isSelected(row.schoolId)
			? selectedSchools.filter((school) => school.id !== row.schoolId)
			: [...selectedSchools, { id: row.schoolId, name: row.school }];
	}

	/** The school the others are merged into: the one the most participants named. */
	function targetOf(ids: readonly string[]) {
		const participants = (id: string) =>
			schools.find((school) => school.schoolId === id)?.sumParticipants ?? 0;
		return ids.toSorted((a, b) => participants(b) - participants(a))[0];
	}

	/**
	 * Folds `sourceIds` into `targetId`, everywhere the schools are named, and names the result
	 * `name` if given. One school alone is just renamed. Resolves to whether it worked.
	 */
	async function mergeSchools(targetId: string, sourceIds: string[], name?: string) {
		normalizing = true;
		try {
			const sources = sourceIds.filter((id) => id !== targetId);
			if (sources.length === 0) {
				if (name) await client.mutate.updateSchool({ __args: { id: targetId, name }, id: true });
			} else {
				await client.mutate.mergeSchools({
					__args: { targetId, sourceIds: sources, name },
					id: true
				});
			}

			toast.success(m.cleanupNormalizeSchoolsSuccess({ count: sources.length + 1 }));
			const merged = new Set([targetId, ...sources]);
			selectedSchools = selectedSchools.filter((school) => !merged.has(school.id));
			newSchoolName = '';
			await loadSchools();
			return true;
		} catch (error) {
			toast.error(m.cleanupNormalizeSchoolsFailed());
			logger.error('Normalizing schools failed', error);
			return false;
		} finally {
			normalizing = false;
		}
	}

	function handleNormalize() {
		if (selectedSchools.length < 1) {
			toast.error(m.cleanupNormalizeSchoolsSelectAtLeastOne());
			return;
		}
		const name = newSchoolName.trim();
		if (!name) {
			toast.error(m.cleanupNormalizeSchoolsEnterNewName());
			return;
		}
		const ids = selectedSchools.map((school) => school.id);
		void mergeSchools(targetOf(ids), ids, name);
	}

	function selectSuggestion(picked: PickedSchool[]) {
		selectedSchools = picked;
		newSchoolName = picked[0]?.name ?? '';
	}

	onMount(() => {
		hotkeys('shift+enter', (event) => {
			event.preventDefault();
			handleNormalize();
		});
	});

	onDestroy(() => {
		hotkeys.unbind('shift+enter');
	});
</script>

{#if schoolsLoading}
	<div class="flex items-center justify-center p-8">
		<span class="loading loading-spinner loading-lg"></span>
	</div>
{:else if schools.length > 0}
	<div class="mt-4">
		<SchoolSuggestions
			{conferenceId}
			merging={normalizing}
			onMerge={mergeSchools}
			onSelect={selectSuggestion}
		/>

		<div class="mb-4 flex flex-col gap-3">
			{#if selectedSchools.length > 0}
				<div class="flex flex-wrap items-center gap-2">
					{#each selectedSchools as school (school.id)}
						<button
							type="button"
							class="badge badge-primary badge-soft gap-1"
							onclick={() =>
								(selectedSchools = selectedSchools.filter((picked) => picked.id !== school.id))}
						>
							{school.name}
							<i class="fa-sharp-duotone fa-solid fa-xmark text-xs"></i>
						</button>
					{/each}
					<button
						type="button"
						class="btn btn-ghost btn-xs ml-auto"
						onclick={() => (selectedSchools = [])}
					>
						<i class="fa-sharp-duotone fa-solid fa-trash-xmark"></i>
						{m.cleanupNormalizeSchoolsClearSelected({ count: selectedSchools.length })}
					</button>
				</div>
			{/if}

			<div class="flex flex-col gap-2 sm:flex-row">
				<input
					id="newSchoolName"
					type="text"
					bind:value={newSchoolName}
					placeholder={m.cleanupNormalizeSchoolsNewNamePlaceholder()}
					aria-label={m.cleanupNormalizeSchoolsNewName()}
					class="input input-bordered w-full flex-1"
				/>
				<button
					type="button"
					onclick={handleNormalize}
					class="btn btn-primary"
					disabled={normalizing || selectedSchools.length < 1 || !newSchoolName.trim()}
				>
					{#if normalizing}
						<span class="loading loading-spinner"></span>
					{:else}
						<i class="fa-sharp-duotone fa-solid fa-code-merge"></i>
					{/if}
					{#if selectedSchools.length === 1}
						{m.cleanupNormalizeSchoolsRenameOne()}
					{:else}
						{m.cleanupNormalizeSchoolsNormalizeMany()}
					{/if}
					<Kbd hotkey="shift+enter" />
				</button>
			</div>
		</div>

		<ManagedTable
			{columns}
			rows={schools}
			{columnClasses}
			onRowClick={toggleSchool}
			isRowSelected={(row) => isSelected(row.schoolId)}
			initialSorting={[{ id: 'school', desc: false }]}
		/>
	</div>
{:else}
	<div class="alert alert-info mt-4">
		<i class="fa-sharp-duotone fa-solid fa-info-circle"></i>
		<span>{m.cleanupNormalizeSchoolsNoSchools()}</span>
	</div>
{/if}
