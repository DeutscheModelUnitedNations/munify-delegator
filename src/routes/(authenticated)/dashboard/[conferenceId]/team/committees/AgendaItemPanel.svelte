<!--
	@component
	One agenda item on the committees page: a row with its title, how many points for discussion and
	papers it has, opening in place to edit title, teaser and points. Saving sends only what changed.
	While nothing is edited, the fields follow changes saved elsewhere; an edit in progress is kept.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import AgendaItemFields from './AgendaItemFields.svelte';
	import SaveDiscardButtons from './SaveDiscardButtons.svelte';
	import { agendaItemChanges, type AgendaItemDraft } from './agendaItemChanges';
	import { onStored } from './inlineDraft';
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
	const stored = $derived(draftOf(item));
	// Seeded from the stored values right away (effects do not run while rendering on the server);
	// the effect below only takes over later changes.
	let base = $state<AgendaItemDraft>(untrack(() => draftOf(item)));
	let draft = $state<AgendaItemDraft>(untrack(() => draftOf(item)));
	let saving = $state(false);
	/** The stored values from before the last save, ignored until newer ones arrive. */
	let stale = $state<AgendaItemDraft>();

	// take over what was saved elsewhere, unless the fields hold an edit (`onStored`)
	$effect.pre(() => {
		const next = onStored({ state: { draft, base, stale }, next: stored, saving });
		if (next.stale !== stale) stale = next.stale;
		if (next.base !== base) {
			base = draftOf(item);
			draft = draftOf(item);
		}
	});

	const changes = $derived(agendaItemChanges({ stored: base, draft }));
	const changed = $derived(Object.values(changes).some((value) => value !== undefined));
	const valid = $derived(!!draft.title.trim());
	const points = $derived(item.discussionPoints.length);

	async function save() {
		saving = true;
		// what is sent becomes the base: fields edited while saving stay edits
		const submitted = { ...draft, discussionPoints: [...draft.discussionPoints] };
		const before = draftOf(item);
		try {
			const promise = client.mutate.updateAgendaItem({
				__args: { id: item.id, ...changes },
				id: true
			});
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
			stale = before;
			base = submitted;
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
		<span class="badge badge-sm badge-ghost {points === 0 ? 'font-bold' : ''}">
			<i
				aria-hidden="true"
				class="ph-duotone {points === 0 ? 'ph-warning text-warning' : 'ph-chats-circle'}"
			></i>
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
			<SaveDiscardButtons {changed} {valid} {saving} onSave={save} onDiscard={discard}>
				<button type="button" class="btn btn-ghost btn-sm text-error ms-auto" onclick={onDelete}>
					<i aria-hidden="true" class="ph-duotone ph-trash"></i>
					{m.deleteAgendaItem()}
				</button>
			</SaveDiscardButtons>
		{/if}
	</div>
</details>
