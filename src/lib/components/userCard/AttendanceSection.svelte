<script lang="ts">
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { toast } from 'svelte-sonner';
	import formatNames from '#lib/helpers/formatNames.js';

	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const entries = $derived(
		await client.liveQuery.attendanceEntries({
			__args: {
				where: {
					conferenceParticipant: {
						conferenceId: { eq: conferenceId },
						userId: { eq: userId }
					}
				},
				orderBy: { timestamp: 'desc' }
			},
			id: true,
			timestamp: true,
			session: { occasion: true },
			recordedBy: { id: true, givenName: true, familyName: true }
		})
	);

	const deleteEntry = async (id: string) => {
		if (!(await confirmDialog({ text: m.deleteAttendanceEntryConfirm(), danger: true }))) return;

		const promise = Promise.resolve(client.mutate.deleteAttendanceEntry({ __args: { id } }));
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.genericToastSuccess(),
			error: m.genericToastError()
		});
		await promise;
	};
</script>

<div class="card flex flex-col gap-2 p-4">
	<h3 class="font-bold">
		<i class="fa-sharp-duotone fa-solid fa-clipboard-list mr-2"></i>
		{m.attendanceLog()}
	</h3>

	{#if entries.length === 0}
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
					{#each entries as entry (entry.id)}
						<tr>
							<td>
								<div>{entry.session.occasion}</div>
								<div class="text-base-content/50 text-xs">
									{formatNames(
										entry.recordedBy.givenName ?? undefined,
										entry.recordedBy.familyName ?? undefined,
										{ givenNameFirst: true }
									)}
								</div>
							</td>
							<td class="text-right text-xs whitespace-nowrap">
								{new Date(entry.timestamp).toLocaleString(getLocale(), {
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
									<i class="fa-sharp-duotone fa-solid fa-trash text-error"></i>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
