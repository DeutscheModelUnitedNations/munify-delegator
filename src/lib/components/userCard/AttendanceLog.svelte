<script lang="ts">
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { client } from '#lib/api/rumbleClient/client';
	import { toast } from 'svelte-sonner';
	import formatNames from '#lib/helpers/formatNames';
	import Empty from './ui/Empty.svelte';

	/** Every scan of the person at the conference, the latest first. */
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

{#if entries.length > 0}
	<ul class="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-x-8 gap-y-1">
		{#each entries as entry (entry.id)}
			<li class="group flex items-center gap-3 py-1">
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
					class="btn btn-ghost btn-xs btn-square hover:text-error opacity-40 group-hover:opacity-100 focus-visible:opacity-100"
					onclick={() => deleteEntry(entry.id)}
					aria-label={m.deleteAttendanceEntry()}
					title={m.deleteAttendanceEntry()}
				>
					<i aria-hidden="true" class="ph-duotone ph-trash"></i>
				</button>
			</li>
		{/each}
	</ul>
{:else}
	<Empty icon="clipboard-text" text={m.attendanceLogEmpty()} />
{/if}
