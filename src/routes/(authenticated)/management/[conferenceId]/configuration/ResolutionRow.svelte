<script lang="ts" module>
	export interface Committee {
		id: string;
		name: string;
		abbreviation: string;
	}

	export interface Resolution {
		id: string;
		title: string;
		fileName: string;
		committee: Committee | null;
	}
</script>

<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { graphql } from '$houdini';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/services/toast';

	let {
		resolution,
		committees,
		onchanged,
		ondelete
	}: {
		resolution: Resolution;
		committees: Committee[];
		onchanged: () => Promise<void>;
		ondelete: (resolution: Resolution) => void;
	} = $props();

	const UpdateResolutionMutation = graphql(`
		mutation UpdateResolutionConfigMutation(
			$id: String!
			$title: String
			$committeeId: String
			$clearCommittee: Boolean
		) {
			updateResolution(
				id: $id
				title: $title
				committeeId: $committeeId
				clearCommittee: $clearCommittee
			) {
				id
			}
		}
	`);

	async function update(changes: {
		title?: string;
		committeeId?: string;
		clearCommittee?: boolean;
	}) {
		const promise = UpdateResolutionMutation.mutate({ id: resolution.id, ...changes });
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		await onchanged();
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
		const committeeId = event.currentTarget.value;
		await update(committeeId ? { committeeId } : { clearCommittee: true });
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
			<i class="fa-duotone fa-file-pdf"></i>
			{resolution.fileName}
		</div>
	</td>
	<td>
		{#if committees.length > 0}
			<select
				class="select select-bordered select-sm w-full min-w-40"
				value={resolution.committee?.id ?? ''}
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
		<a
			class="btn btn-ghost btn-sm"
			href={`/api/resolution/${resolution.id}`}
			target="_blank"
			rel="noopener"
			aria-label={m.resolutionDownload()}
		>
			<i class="fas fa-download"></i>
		</a>
		<button
			type="button"
			class="btn btn-ghost btn-sm text-error"
			onclick={() => ondelete(resolution)}
			aria-label={m.delete()}
		>
			<i class="fas fa-trash"></i>
		</button>
	</td>
</tr>
