<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { graphql } from '$houdini';
	import { toast } from 'svelte-sonner';
	import formatNames from '$lib/services/formatNames';

	interface AttendanceEntryData {
		id: string;
		timestamp: Date;
		occasion: string;
		recordedBy: {
			id: string;
			given_name: string;
			family_name: string;
		};
	}

	interface Props {
		conferenceParticipantStatusId: string;
		entries: AttendanceEntryData[];
		onChanged: () => void;
	}

	let { conferenceParticipantStatusId, entries, onChanged }: Props = $props();

	let occasion = $state('');

	const createAttendanceEntryMutation = graphql(`
		mutation createAttendanceEntry($conferenceParticipantStatusId: String!, $occasion: String!) {
			createOneAttendanceEntry(
				conferenceParticipantStatusId: $conferenceParticipantStatusId
				occasion: $occasion
			) {
				id
			}
		}
	`);

	const deleteAttendanceEntryMutation = graphql(`
		mutation deleteAttendanceEntry($id: String!) {
			deleteOneAttendanceEntry(where: { id: $id }) {
				id
			}
		}
	`);

	const createEntry = async () => {
		if (!occasion.trim()) return;

		const promise = createAttendanceEntryMutation.mutate({
			conferenceParticipantStatusId,
			occasion: occasion.trim()
		});
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.genericToastSuccess(),
			error: m.genericToastError()
		});
		await promise;
		occasion = '';
		onChanged();
	};

	const deleteEntry = async (id: string) => {
		if (!confirm(m.deleteAttendanceEntryConfirm())) return;

		const promise = deleteAttendanceEntryMutation.mutate({
			id
		});
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.genericToastSuccess(),
			error: m.genericToastError()
		});
		await promise;
		onChanged();
	};

	const sortedEntries = $derived(
		[...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
	);
</script>

<div class="card bg-base-100 flex flex-col gap-2 p-4 shadow-md">
	<h3 class="font-bold">
		<i class="fa-duotone fa-clipboard-list mr-2"></i>
		{m.attendanceLog()}
	</h3>

	<div class="join">
		<input
			class="input join-item w-full"
			bind:value={occasion}
			type="text"
			placeholder={m.occasion()}
			onkeydown={(e) => {
				if (e.key === 'Enter') createEntry();
			}}
		/>
		<button
			class="btn join-item"
			onclick={createEntry}
			disabled={!occasion.trim()}
			aria-label={m.recordEntry()}
		>
			<i class="fa-solid fa-plus"></i>
			{m.recordEntry()}
		</button>
	</div>

	{#if sortedEntries.length === 0}
		<p class="text-base-content/50 text-sm">{m.noAttendanceEntries()}</p>
	{:else}
		<div class="max-h-60 overflow-y-auto">
			<table class="table table-sm">
				<thead>
					<tr>
						<th>{m.occasion()}</th>
						<th class="text-right"></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each sortedEntries as entry (entry.id)}
						<tr>
							<td>
								<div>{entry.occasion}</div>
								<div class="text-base-content/50 text-xs">
									{formatNames(entry.recordedBy.given_name, entry.recordedBy.family_name, {
										givenNameFirst: true
									})}
								</div>
							</td>
							<td class="text-right text-xs whitespace-nowrap">
								{new Date(entry.timestamp).toLocaleString('de', {
									dateStyle: 'short',
									timeStyle: 'short'
								})}
							</td>
							<td>
								<button
									class="btn btn-ghost btn-xs btn-square"
									onclick={() => deleteEntry(entry.id)}
									aria-label={m.deleteAttendanceEntry()}
								>
									<i class="fa-duotone fa-trash text-error"></i>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
