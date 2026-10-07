<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import type { ManagedColumn } from '$lib/components/tanStackTable/managedTable';
	import { toast } from 'svelte-sonner';
	import ManagedTable from '$lib/components/tanStackTable/ui/ManagedTable.svelte';
	import hotkeys from 'hotkeys-js';
	import { onDestroy, onMount } from 'svelte';
	import Kbd from '$lib/components/Kbd.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const schoolSelection = {
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

	let schoolsLoading = $state(false);
	let normalizing = $state(false);
	let loadedSchools = $state<SchoolRow[]>([]);

	async function loadSchools() {
		schoolsLoading = true;
		try {
			loadedSchools = (await fetchSchools()).schools;
		} finally {
			schoolsLoading = false;
		}
	}

	$effect(() => {
		if (conferenceId) void loadSchools();
	});

	let newSchoolName = $state('');
	let selectedSchools = $state<string[]>([]);

	const schools = $derived(loadedSchools);

	$effect(() => {
		if (selectedSchools.length === 1) {
			newSchoolName = selectedSchools[0];
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
		selectedSchools = selectedSchools.includes(row.school)
			? selectedSchools.filter((school) => school !== row.school)
			: [...selectedSchools, row.school];
	}

	const handleNormalize = async () => {
		if (selectedSchools.length < 1) {
			toast.error(m.cleanupNormalizeSchoolsSelectAtLeastOne());
			return;
		}

		if (!newSchoolName.trim()) {
			toast.error(m.cleanupNormalizeSchoolsEnterNewName());
			return;
		}

		normalizing = true;
		try {
			await client.mutate.normalizeSchoolsInConference({
				__args: {
					conferenceId,
					schoolsToMerge: [...selectedSchools],
					newSchoolName: newSchoolName.trim()
				},
				id: true,
				schools: schoolSelection
			});

			toast.success(m.cleanupNormalizeSchoolsSuccess({ count: selectedSchools.length }));
			selectedSchools = [];
			newSchoolName = '';
			await loadSchools();
		} catch (error) {
			toast.error(m.cleanupNormalizeSchoolsFailed());
			console.error(error);
		} finally {
			normalizing = false;
		}
	};

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
		<ManagedTable
			{columns}
			rows={schools}
			{columnClasses}
			onRowClick={toggleSchool}
			isRowSelected={(row) => selectedSchools.includes(row.school)}
			initialSorting={[{ id: 'school', desc: false }]}
		/>

		<div class="my-4 flex flex-col gap-2">
			<button class="btn btn-outline" onclick={() => (selectedSchools = [])}>
				{m.cleanupNormalizeSchoolsClearSelected({ count: selectedSchools.length })}
			</button>
			<div class="flex flex-wrap gap-1">
				{#each selectedSchools as school (school)}
					<span class="badge">{school}</span>
				{/each}
			</div>
		</div>

		<div class="mt-6 flex items-end gap-4">
			<div class="form-control flex-1">
				<label class="label" for="newSchoolName">
					<span class="label-text">{m.cleanupNormalizeSchoolsNewName()}</span>
				</label>
				<input
					id="newSchoolName"
					type="text"
					bind:value={newSchoolName}
					placeholder={m.cleanupNormalizeSchoolsNewNamePlaceholder()}
					class="input input-bordered w-full"
				/>
			</div>
			<button
				type="button"
				onclick={handleNormalize}
				class="btn btn-primary"
				disabled={normalizing || selectedSchools.length < 1 || !newSchoolName.trim()}
			>
				{#if normalizing}
					<span class="loading loading-spinner"></span>
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
{:else}
	<div class="alert alert-info mt-4">
		<i class="fa-duotone fa-info-circle"></i>
		<span>{m.cleanupNormalizeSchoolsNoSchools()}</span>
	</div>
{/if}
