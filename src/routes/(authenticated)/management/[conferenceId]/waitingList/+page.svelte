<script lang="ts">
	import type { PageData } from './$houdini';
	import DataTable from '$lib/components/DataTable/DataTable.svelte';
	import type { TableColumns } from 'svelte-table';
	import { cache, graphql, type WaitingListManagementQuery$result } from '$houdini';
	import { capitalizeFirstLetter } from '$lib/services/capitalizeFirstLetter';
	import { m } from '$lib/paraglide/messages';
	import toast from 'svelte-french-toast';
	import { invalidateAll } from '$app/navigation';
	import { genericPromiseToastMessages } from '$lib/services/toast';

	let { data }: { data: PageData } = $props();

	let waitingListQuery = data.WaitingListManagementQuery;
	let conference = data.conferences.find((c) => c.id === data.conferenceId);

	let filterHidden = $state(true);
	let rows = $derived(
		$waitingListQuery.data?.findManyWaitingListEntry?.filter(
			(
				entry: NonNullable<WaitingListManagementQuery$result['findManyWaitingListEntry']>[number]
			) => (filterHidden ? !entry.hidden : true)
		) ?? []
	);

	const calculateConferenceAge = (birthday: Date) => {
		if (!conference?.startConference) return undefined;
		const age = conference.startConference.getFullYear() - birthday.getFullYear();
		const monthsDiff = conference.startConference.getMonth() - birthday.getMonth();
		const d = conference.startConference.getDate() - birthday.getDate();
		return (monthsDiff < 0 || (monthsDiff === 0 && d < 0) ? age - 1 : age).toString();
	};

	const columns: TableColumns<
		NonNullable<WaitingListManagementQuery$result['findManyWaitingListEntry']>[number]
	> = [
		{
			key: 'timestamp',
			title: m.timestamp(),
			value: (row) => new Date(row.createdAt).getTime(),
			renderValue: (row) => new Date(row.createdAt).toLocaleString(),
			sortable: true,
			class: 'whitespace-nowrap'
		},
		{
			key: 'family_name',
			title: m.familyName(),
			value: (row) => capitalizeFirstLetter(row.user.family_name),
			sortable: true
		},
		{
			key: 'given_name',
			title: m.givenName(),
			value: (row) => capitalizeFirstLetter(row.user.given_name),
			sortable: true
		},
		{
			key: 'email',
			title: m.email(),
			value: (row) => row.user.email,
			sortable: true
		},
		{
			key: 'birthday',
			title: m.conferenceAge(),
			value: (row) =>
				row.user?.birthday && conference?.startConference
					? (calculateConferenceAge(row.user.birthday) ?? 'N/A')
					: 'N/A',
			sortable: true,
			class: 'text-center',
			headerClass: 'text-center'
		},
		{
			key: 'participationCount',
			title: m.participationCount(),
			value: (row) => row.user.conferenceParticipationsCount.toString(),
			sortable: true,
			class: 'text-center',
			headerClass: 'text-center'
		},
		{
			key: 'city',
			title: m.city(),
			value: (row) => (row.user.city ? capitalizeFirstLetter(row.user.city) : 'N/A'),
			sortable: true
		},
		{
			key: 'hidden',
			title: m.hidden(),
			value: (row) => (row.hidden ? 1 : 0),
			renderValue: (row) => {
				if (row.hidden) {
					return `<i class="fas fa-eye-slash"></i>`;
				}
				return `<i class="fas fa-eye"></i>`;
			},
			parseHTML: true,
			sortable: true,
			class: 'text-center',
			headerClass: 'text-center'
		}
	];

	const updateWaitingListEntryMutation = graphql(`
		mutation UpdateWaitingListEntryMutation($id: String!, $hidden: Boolean!) {
			updateOneWaitingListEntry(where: { id: $id }, data: { hidden: { set: $hidden } }) {
				id
			}
		}
	`);

	const deleteWaitingListEntryMutation = graphql(`
		mutation DeleteWaitingListEntryMutation($id: String!) {
			deleteOneWaitingListEntry(where: { id: $id }) {
				id
			}
		}
	`);
</script>

<div class="alert mb-4">
	<i class="fa-duotone fa-filter"></i>
	<span>{m.filterHiddenEntries()}</span>
	<button class="btn btn-ghost ml-4" onclick={() => (filterHidden = !filterHidden)}>
		{#if filterHidden}
			<i class="fa-duotone fa-toggle-on"></i> {m.on()}
		{:else}
			<i class="fa-duotone fa-toggle-off"></i> {m.off()}
		{/if}
	</button>
</div>

<DataTable
	{columns}
	{rows}
	enableSearch={true}
	queryParamKey="filter"
	sortBy="timestamp"
	showExpandIcon
>
	{#snippet expandedRowContent(row)}
		<div class="flex flex-col justify-between gap-4">
			<table class="table">
				<tbody>
					<tr>
						<td class="text-center"><i class="fa-duotone fa-school text-lg"></i></td>
						<td class="w-full">
							{row?.school}
						</td>
					</tr>
					<tr>
						<td class="text-center"><i class="fa-duotone fa-fire-flame-curved text-lg"></i></td>
						<td>
							{row?.motivation}
						</td>
					</tr>
					<tr>
						<td class="text-center"><i class="fa-duotone fa-compass text-lg"></i></td>
						<td>
							{row?.experience}
						</td>
					</tr>
					<tr>
						<td class="text-center"><i class="fa-duotone fa-ban text-lg"></i></td>
						<td>
							{#if row?.requests}
								{row?.requests}
							{:else}
								<i class="fa-duotone fa-dash"></i>
							{/if}
						</td>
					</tr>
				</tbody>
			</table>

			<div class="flex flex-row flex-wrap gap-4">
				<a
					class="btn btn-primary"
					href="/management/{data.conferenceId}/seats?assignUserId={row.user.id}"
				>
					<i class="fa-solid fa-user-plus"></i>
					{m.assignSeat()}
				</a>
				<button
					class="btn btn-outline"
					onclick={async () => {
						await toast.promise(
							updateWaitingListEntryMutation.mutate({
								id: row.id,
								hidden: !row.hidden
							}),
							genericPromiseToastMessages
						);
						cache.markStale();
						await invalidateAll();
					}}
				>
					{#if row.hidden}
						<i class="fa-solid fa-eye"></i> {m.show()}
					{:else}
						<i class="fa-solid fa-eye-slash"></i> {m.hide()}
					{/if}
				</button>
				<button
					class="btn btn-outline btn-error"
					onclick={async () => {
						if (!confirm(m.areYouSure())) return;
						await toast.promise(
							deleteWaitingListEntryMutation.mutate({ id: row.id }),
							genericPromiseToastMessages
						);

						cache.markStale();
						await invalidateAll();
					}}
				>
					<i class="fas fa-trash"></i>
					{m.deleteEntry()}
				</button>
			</div>
		</div>
	{/snippet}
</DataTable>
