<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { client } from '$lib/api/rumbleClient/client';
	import { toast } from 'svelte-sonner';
	import formatNames from '$lib/helpers/formatNames';

	interface AttendanceEntryData {
		id: string;
		timestamp: Date;
		occasion: string;
		recordedBy: {
			id: string;
			givenName: string | null;
			familyName: string | null;
		};
	}

	interface Props {
		userId: string;
		conferenceId: string;
		entries: AttendanceEntryData[];
		onChanged: () => void;
	}

	let { userId, conferenceId, entries, onChanged }: Props = $props();

	let occasion = $state('');

	const createEntry = async () => {
		if (!occasion.trim()) return;

		const promise = client.mutate.createAttendanceEntry({
			__args: { userId, conferenceId, occasion: occasion.trim() },
			id: true
		});
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.genericToastSuccess(),
			error: m.genericToastError()
		});
		try {
			await promise;
			occasion = '';
		} finally {
			onChanged();
		}
	};

	const deleteEntry = async (id: string) => {
		if (!confirm(m.deleteAttendanceEntryConfirm())) return;

		const promise = Promise.resolve(client.mutate.deleteAttendanceEntry({ __args: { id } }));
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.genericToastSuccess(),
			error: m.genericToastError()
		});
		try {
			await promise;
		} finally {
			onChanged();
		}
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
