<!--
	@component
	One agenda item on the committees page: a row with its title, how many points for discussion and
	papers it has, opening in place to edit title, teaser and points. Saving sends only what changed.
	While nothing is edited, the fields follow changes saved elsewhere; an edit in progress is kept.
-->
<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import AgendaItemFields from './AgendaItemFields.svelte';
	import { agendaItemChanges, type AgendaItemDraft } from './agendaItemChanges';
	import type { AgendaItem } from './types';

	interface Props {
		item: AgendaItem;
		canEdit: boolean;
		/** Opened on arrival, for a link that names this agenda item. */
		initiallyOpen?: boolean;
		onDelete: () => void;
	}

	let { item, canEdit, initiallyOpen = false, onDelete }: Props = $props();

	const draftOf = (stored: AgendaItem): AgendaItemDraft => ({
		title: stored.title,
		teaserText: stored.teaserText ?? '',
		discussionPoints: [...stored.discussionPoints]
	});
	const same = (a: AgendaItemDraft, b: AgendaItemDraft) => JSON.stringify(a) === JSON.stringify(b);

	const stored = $derived(draftOf(item));
	let base = $state<AgendaItemDraft>({ title: '', teaserText: '', discussionPoints: [] });
	let draft = $state<AgendaItemDraft>({ title: '', teaserText: '', discussionPoints: [] });
	let saving = $state(false);

	// take over what was saved elsewhere, unless the fields hold an edit
	$effect.pre(() => {
		const next = stored;
		if (same(draft, base) && !same(next, base)) {
			base = draftOf(item);
			draft = draftOf(item);
		}
	});

	const changes = $derived(agendaItemChanges({ stored: item, draft }));
	const changed = $derived(Object.values(changes).some((value) => value !== undefined));
	const valid = $derived(!!draft.title.trim());
	const points = $derived(item.discussionPoints.length);

	async function save() {
		saving = true;
		try {
			const promise = client.mutate.updateAgendaItem({
				__args: { id: item.id, ...changes },
				id: true
			});
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
			base = { ...draft, discussionPoints: [...draft.discussionPoints] };
		} catch {
			// the toast shows what went wrong; the fields keep the edit
		} finally {
			saving = false;
		}
	}

	function discard() {
		base = draftOf(item);
		draft = draftOf(item);
	}
</script>

<details class="collapse-arrow border-base-300 bg-base-100 collapse border" open={initiallyOpen}>
	<summary class="collapse-title flex flex-wrap items-center gap-x-4 gap-y-1 pe-12">
		<span class="min-w-0 flex-1 basis-48 font-bold break-words hyphens-auto">{item.title}</span>
		<span class="badge badge-sm {points === 0 ? 'badge-warning badge-outline' : 'badge-ghost'}">
			<i aria-hidden="true" class="ph-duotone ph-chats-circle"></i>
			{points === 0 ? m.noDiscussionPoints() : m.discussionPointsCount({ count: points })}
		</span>
		<span
			class="flex items-center gap-1 text-sm opacity-70"
			title={item.papers.length === 1 ? m.paper() : m.papers()}
		>
			<i aria-hidden="true" class="ph-duotone ph-file-text"></i>
			<span class="sr-only">{m.papers()}:</span>
			{item.papers.length}
		</span>
		{#if changed}
			<span class="badge badge-sm badge-info badge-soft">{m.unsavedChanges()}</span>
		{/if}
	</summary>
	<div class="collapse-content flex flex-col gap-4">
		<fieldset disabled={!canEdit} class="flex flex-col gap-4">
			<AgendaItemFields
				bind:title={draft.title}
				bind:teaserText={draft.teaserText}
				bind:discussionPoints={draft.discussionPoints}
			/>
		</fieldset>
		{#if canEdit}
			<div class="flex flex-wrap items-center gap-2">
				<button
					type="button"
					class="btn btn-primary btn-sm"
					disabled={!changed || !valid || saving}
					onclick={save}
				>
					<i aria-hidden="true" class="ph-duotone ph-floppy-disk"></i>
					{m.save()}
				</button>
				<button
					type="button"
					class="btn btn-ghost btn-sm"
					disabled={!changed || saving}
					onclick={discard}
				>
					{m.discardChanges()}
				</button>
				<button type="button" class="btn btn-ghost btn-sm text-error ms-auto" onclick={onDelete}>
					<i aria-hidden="true" class="ph-duotone ph-trash"></i>
					{m.deleteAgendaItem()}
				</button>
			</div>
		{/if}
	</div>
</details>
