<script lang="ts" module>
	export interface ResolutionCommittee {
		id: string;
		name: string;
		abbreviation: string;
	}
</script>

<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { downloadResolution } from '#lib/api/downloadResolution';
	import { genericPromiseToastMessages } from '#lib/utils/toast';

	let {
		resolutionId,
		committees,
		linked,
		ondelete
	}: {
		resolutionId: string;
		committees: ResolutionCommittee[];
		/** Whether a CHASE link is active: the resolutions it adopted are then its to keep. */
		linked: boolean;
		ondelete: (resolution: { id: string; title: string }) => void;
	} = $props();

	const resolution = $derived(
		await client.liveQuery.resolution({
			__args: { id: resolutionId },
			title: true,
			committeeId: true,
			chasePaperId: true,
			file: { fileName: true }
		})
	);
	const fromChase = $derived(linked && resolution.chasePaperId !== null);

	async function update(changes: { title?: string; committeeId?: string | null }) {
		const promise = client.mutate.updateResolution({
			__args: { id: resolutionId, ...changes },
			id: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	}

	async function saveTitle(event: FocusEvent & { currentTarget: EventTarget & HTMLInputElement }) {
		const target = event.currentTarget;
		const newTitle = target.value.trim();
		if (!newTitle || newTitle === resolution.title) {
			target.value = resolution.title;
			return;
		}
		await update({ title: newTitle });
	}

	async function changeCommittee(
		event: Event & { currentTarget: EventTarget & HTMLSelectElement }
	) {
		await update({ committeeId: event.currentTarget.value || null });
	}
</script>

<tr>
	<td>
		<input
			type="text"
			class="input input-bordered input-sm w-full min-w-48"
			value={resolution.title}
			aria-label={m.resolutionColumnTitle()}
			onblur={saveTitle}
		/>
		<div class="mt-1 text-xs opacity-60">
			<i class="fa-sharp-duotone fa-solid fa-file-pdf"></i>
			{resolution.file.fileName}
			{#if fromChase}
				<span class="badge badge-sm badge-ghost ml-1" title={m.resolutionFromChaseLocked()}>
					<i class="fa-sharp-duotone fa-solid fa-link"></i>
					{m.resolutionFromChase()}
				</span>
			{/if}
		</div>
	</td>
	<td>
		{#if committees.length > 0}
			<select
				class="select select-bordered select-sm w-full min-w-40"
				value={resolution.committeeId ?? ''}
				aria-label={m.resolutionColumnCommittee()}
				onchange={changeCommittee}
			>
				<option value="">{m.resolutionNoCommittee()}</option>
				{#each committees as committee (committee.id)}
					<option value={committee.id}>{committee.abbreviation}</option>
				{/each}
			</select>
		{:else}
			<span class="opacity-60">—</span>
		{/if}
	</td>
	<td class="text-right">
		<button
			type="button"
			class="btn btn-ghost btn-sm"
			onclick={() => downloadResolution(resolutionId)}
			aria-label={m.resolutionDownload()}
		>
			<i class="fas fa-download"></i>
		</button>
		<span
			class={fromChase ? 'tooltip tooltip-left' : undefined}
			data-tip={fromChase ? m.resolutionFromChaseLocked() : undefined}
		>
			<button
				type="button"
				class="btn btn-ghost btn-sm text-error"
				disabled={fromChase}
				onclick={() => ondelete({ id: resolutionId, title: resolution.title })}
				aria-label={m.delete()}
			>
				<i class="fas fa-trash"></i>
			</button>
		</span>
	</td>
</tr>
