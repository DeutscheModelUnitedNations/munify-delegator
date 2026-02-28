<script lang="ts">
	import {
		createSvelteTable,
		FlexRender,
		renderComponent,
		getCoreRowModel,
		getSortedRowModel,
		getPaginationRowModel,
		type ColumnDef,
		type SortingState,
		type PaginationState
	} from '$lib/components/TanStackTable';
	import { DataTable } from '$lib/components/TanStackTable/ui';
	import { m } from '$lib/paraglide/messages';
	import { capitalizeFirstLetter } from '$lib/services/capitalizeFirstLetter';
	import type { PageData } from './$houdini';
	import type { ParticipantRow, ParticipationRole } from './types';
	import RoleBadge from './RoleBadge.svelte';

	const { data }: { data: PageData } = $props();
	const queryData = $derived(data.AllConferenceParticipantsQuery);

	const participants: ParticipantRow[] = $derived.by(() => {
		const rows: ParticipantRow[] = [];

		for (const entry of $queryData.data?.findManyDelegationMembers ?? []) {
			rows.push({
				id: entry.user.id,
				given_name: entry.user.given_name,
				family_name: entry.user.family_name,
				email: entry.user.email,
				role: 'DELEGATION_MEMBER'
			});
		}

		for (const entry of $queryData.data?.findManyConferenceSupervisors ?? []) {
			rows.push({
				id: entry.user.id,
				given_name: entry.user.given_name,
				family_name: entry.user.family_name,
				email: entry.user.email,
				role: 'SUPERVISOR'
			});
		}

		for (const entry of $queryData.data?.findManySingleParticipants ?? []) {
			rows.push({
				id: entry.user.id,
				given_name: entry.user.given_name,
				family_name: entry.user.family_name,
				email: entry.user.email,
				role: 'SINGLE_PARTICIPANT'
			});
		}

		for (const entry of $queryData.data?.findManyTeamMembers ?? []) {
			rows.push({
				id: entry.user.id,
				given_name: entry.user.given_name,
				family_name: entry.user.family_name,
				email: entry.user.email,
				role: 'TEAM_MEMBER'
			});
		}

		return rows;
	});

	const localizeRole = (role: ParticipationRole): string => {
		switch (role) {
			case 'SUPERVISOR':
				return m.supervisor();
			case 'SINGLE_PARTICIPANT':
				return m.singleParticipant();
			case 'DELEGATION_MEMBER':
				return m.delegationMember();
			case 'TEAM_MEMBER':
				return m.teamMember();
		}
	};

	const columns: ColumnDef<ParticipantRow>[] = [
		{
			accessorKey: 'family_name',
			header: m.familyName(),
			cell: ({ row }) => capitalizeFirstLetter(row.original.family_name)
		},
		{
			accessorKey: 'given_name',
			header: m.givenName(),
			cell: ({ row }) => capitalizeFirstLetter(row.original.given_name)
		},
		{
			accessorKey: 'email',
			header: m.email(),
			cell: ({ row }) => row.original.email ?? ''
		},
		{
			accessorKey: 'role',
			header: m.role(),
			sortingFn: (rowA, rowB) => {
				return localizeRole(rowA.original.role).localeCompare(localizeRole(rowB.original.role));
			},
			cell: ({ row }) => renderComponent(RoleBadge, { role: row.original.role })
		}
	];

	let sorting = $state<SortingState>([{ id: 'family_name', desc: false }]);
	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 20 });

	const table = createSvelteTable({
		get data() {
			return participants;
		},
		columns,
		state: {
			get sorting() {
				return sorting;
			},
			get pagination() {
				return pagination;
			}
		},
		onSortingChange: (updater) => {
			sorting = typeof updater === 'function' ? updater(sorting) : updater;
		},
		onPaginationChange: (updater) => {
			pagination = typeof updater === 'function' ? updater(pagination) : updater;
		},
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel()
	});
</script>

<div class="flex h-full flex-col">
	<DataTable.Root class="table-zebra">
		<DataTable.Header>
			{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
				<tr>
					{#each headerGroup.headers as header (header.id)}
						<DataTable.Head>
							{#if !header.isPlaceholder}
								<button
									class="flex items-center gap-2"
									class:cursor-pointer={header.column.getCanSort()}
									onclick={() => header.column.toggleSorting()}
								>
									<FlexRender
										content={header.column.columnDef.header}
										context={header.getContext()}
									/>
									{#if header.column.getIsSorted() === 'asc'}
										<i class="fa-duotone fa-arrow-down-a-z text-xs"></i>
									{:else if header.column.getIsSorted() === 'desc'}
										<i class="fa-duotone fa-arrow-down-z-a text-xs"></i>
									{:else if header.column.getCanSort()}
										<i class="fa-duotone fa-arrows-up-down text-xs opacity-30"></i>
									{/if}
								</button>
							{/if}
						</DataTable.Head>
					{/each}
				</tr>
			{/each}
		</DataTable.Header>
		<DataTable.Body>
			{#each table.getRowModel().rows as row (row.id)}
				<DataTable.Row>
					{#each row.getVisibleCells() as cell (cell.id)}
						<DataTable.Cell>
							<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
						</DataTable.Cell>
					{/each}
				</DataTable.Row>
			{:else}
				<tr>
					<td colspan={columns.length} class="text-center py-8 text-base-content/50">
						{m.noResults()}
					</td>
				</tr>
			{/each}
		</DataTable.Body>
	</DataTable.Root>

	<DataTable.Pagination {table} />
</div>
