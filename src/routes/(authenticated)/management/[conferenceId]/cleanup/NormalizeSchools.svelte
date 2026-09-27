<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { type TableColumns } from 'svelte-table';
	import { toast } from 'svelte-sonner';
	import DataTable from '$lib/components/dataTable/DataTable.svelte';
	import CheckboxForTable from './CheckboxForTable.svelte';
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
		if (newSchoolName) {
			newSchoolName = newSchoolName.replace(',', ' ');
			newSchoolName = newSchoolName.replace('.', ' ');
		}
	});

	$effect(() => {
		if (selectedSchools.length === 1) {
			newSchoolName = selectedSchools[0];
		}
	});

	const columns: TableColumns<SchoolRow> = [
		{
			key: 'selected',
			title: '',
			value: (row) => (selectedSchools.includes(row.school) ? 1 : 0),
			renderComponent: CheckboxForTable
		},
		{
			key: 'school',
			title: m.cleanupNormalizeSchoolsColumnSchool(),
			value: (row) => row.school,
			sortable: true
		},
		{
			key: 'delegationCount',
			title: m.cleanupNormalizeSchoolsColumnDelegations(),
			value: (row) => row.delegationCount,
			sortable: true,
			class: 'text-center',
			headerClass: 'text-center'
		},
		{
			key: 'delegationMembers',
			title: m.cleanupNormalizeSchoolsColumnDelegationMembers(),
			value: (row) => row.delegationMembers,
			sortable: true,
			class: 'text-center',
			headerClass: 'text-center'
		},
		{
			key: 'singleParticipants',
			title: m.singleParticipants(),
			value: (row) => row.singleParticipants,
			sortable: true,
			class: 'text-center',
			headerClass: 'text-center'
		},
		{
			key: 'sumParticipants',
			title: m.cleanupNormalizeSchoolsColumnTotalParticipants(),
			value: (row) => row.sumParticipants,
			sortable: true,
			class: 'text-center',
			headerClass: 'text-center'
		}
	];

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
		<DataTable
			{columns}
			rows={schools}
			selectOnClick
			rowKey="school"
			bind:selected={selectedSchools}
			sortBy="school"
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
