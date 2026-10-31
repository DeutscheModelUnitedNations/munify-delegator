<script lang="ts">
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { client } from '#lib/api/rumbleClient/client';
	import { toast } from 'svelte-sonner';
	import formatNames from '#lib/helpers/formatNames';

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

<div class="flex items-start gap-4 px-4 py-3">
	<i
		class="fa-sharp-duotone fa-solid fa-clipboard-list text-base-content/60 w-6 pt-0.5 text-center text-lg"
	></i>
	<div class="flex min-w-0 grow flex-col gap-2">
		<span class="font-semibold">{m.attendanceLog()}</span>
		{#if entries.length === 0}
			<span class="text-base-content/60 text-sm">{m.noAttendanceEntries()}</span>
		{:else}
			<ul class="flex max-h-72 flex-col gap-1 overflow-y-auto">
				{#each entries as entry (entry.id)}
					<li class="bg-base-100 rounded-field flex items-center gap-3 px-3 py-2">
						<i class="fa-sharp-duotone fa-solid fa-circle-check text-success"></i>
						<div class="flex min-w-0 grow flex-col">
							<span class="truncate">{entry.session.occasion}</span>
							<span class="text-base-content/60 text-xs">
								{new Date(entry.timestamp).toLocaleString(getLocale(), {
									dateStyle: 'short',
									timeStyle: 'short'
								})}
								·
								{formatNames({
									givenName: entry.recordedBy.givenName ?? undefined,
									familyName: entry.recordedBy.familyName ?? undefined,
									options: { givenNameFirst: true }
								})}
							</span>
						</div>
						<button
							class="btn btn-ghost btn-xs btn-square text-error"
							onclick={() => deleteEntry(entry.id)}
							aria-label={m.deleteAttendanceEntry()}
							title={m.deleteAttendanceEntry()}
						>
							<i class="fa-sharp-duotone fa-solid fa-trash"></i>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
