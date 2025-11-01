<script lang="ts">
	import { graphql, type ConferenceSchools$result } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { type TableColumns } from 'svelte-table';
	import toast from 'svelte-french-toast';
	import DataTable from '$lib/components/DataTable/DataTable.svelte';
	import CheckboxForTable from './CheckboxForTable.svelte';
	import hotkeys from 'hotkeys-js';
	import { onDestroy, onMount } from 'svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	let conferenceSchoolsQuery = graphql(`
		query ConferenceSchools($conferenceId: String!) {
			findUniqueConference(where: { id: $conferenceId }) {
				id
				schools {
					school
					delegationCount
					delegationMembers
					singleParticipants
					sumParticipants
				}
			}
		}
	`);

	$effect(() => {
		if (conferenceId) {
			conferenceSchoolsQuery.fetch({ variables: { conferenceId } });
		}
	});

	const normalizeSchools = graphql(`
		mutation NormalizeSchools(
			$conferenceId: String!
			$schoolsToMerge: [String!]!
			$newSchoolName: String!
		) {
			normalizeSchoolsInConference(
				conferenceId: $conferenceId
				schoolsToMerge: $schoolsToMerge
				newSchoolName: $newSchoolName
			) {
				id
				schools {
					school
					delegationCount
					delegationMembers
					singleParticipants
					sumParticipants
				}
			}
		}
	`);

	let newSchoolName = $state('');
	let selectedSchools = $state<string[]>([]);

	const schools = $derived.by(() => {
		return $conferenceSchoolsQuery.data?.findUniqueConference?.schools ?? [];
	});

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

	const columns: TableColumns<
		NonNullable<ConferenceSchools$result['findUniqueConference']>['schools'][number]
	> = [
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

		try {
			await normalizeSchools.mutate({
				conferenceId,
				schoolsToMerge: Array.from(selectedSchools),
				newSchoolName: newSchoolName.trim()
			});

			toast.success(m.cleanupNormalizeSchoolsSuccess({ count: selectedSchools.length }));
			selectedSchools = [];
			newSchoolName = '';
			conferenceSchoolsQuery.fetch({ variables: { conferenceId } });
		} catch (error) {
			toast.error(m.cleanupNormalizeSchoolsFailed());
			console.error(error);
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

{#if $conferenceSchoolsQuery.fetching}
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
				disabled={$normalizeSchools.fetching || selectedSchools.length < 1 || !newSchoolName.trim()}
			>
				{#if $normalizeSchools.fetching}
					<span class="loading loading-spinner"></span>
				{/if}
				{#if selectedSchools.length === 1}
					{m.cleanupNormalizeSchoolsRenameOne()}
				{:else}
					{m.cleanupNormalizeSchoolsNormalizeMany()}
				{/if}
				<span class="kbd">⇧+↵</span>
			</button>
		</div>
	</div>
{:else}
	<div class="alert alert-info mt-4">
		<i class="fa-duotone fa-info-circle"></i>
		<span>{m.cleanupNormalizeSchoolsNoSchools()}</span>
	</div>
{/if}
