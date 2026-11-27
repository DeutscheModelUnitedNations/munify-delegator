<script lang="ts">
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { withoutBlankPoints } from '#lib/schemata/discussionPoints';
	import DiscussionPointsEditor from '#lib/components/discussionPoints/DiscussionPointsEditor.svelte';

	/**
	 * The points for discussion of the agenda item an agenda item page belongs to, edited next to
	 * its text. They are the agenda item's, not the page's: saved at once, live for authors and
	 * reviewers, filled into the page where `{{Diskussionspunkte}}` stands (else below the title).
	 */
	let { agendaItemId }: { agendaItemId: string } = $props();

	// seeded once: re-reading while typing would discard the edits
	const seed = await client.query.committeeAgendaItem({
		__args: { id: untrack(() => agendaItemId) },
		discussionPoints: true
	});

	let points = $state<string[]>([...seed.discussionPoints]);
	let saved = $state<string[]>(withoutBlankPoints(seed.discussionPoints));
	let saving = $state(false);
	const dirty = $derived(JSON.stringify(withoutBlankPoints(points)) !== JSON.stringify(saved));

	async function save() {
		saving = true;
		try {
			const promise = client.mutate.setAgendaItemDiscussionPoints({
				__args: { agendaItemId, discussionPoints: withoutBlankPoints(points) },
				discussionPoints: true
			});
			toast.promise(promise, genericPromiseToastMessages);
			const result = await promise;
			saved = [...result.discussionPoints];
			points = [...result.discussionPoints];
		} catch {
			// the toast shows the failure
		} finally {
			saving = false;
		}
	}
</script>

<section
	class="flex flex-col gap-2"
	aria-labelledby="guide-discussion-points"
	data-tour="team.guidePage.discussionPoints"
>
	<h2 id="guide-discussion-points" class="text-xs font-bold tracking-wider uppercase opacity-80">
		{m.discussionPoints()}
	</h2>
	<p class="text-base-content/70 text-sm">{m.guideDiscussionPointsHint()}</p>
	<DiscussionPointsEditor bind:points bare />
	<div>
		<button class="btn btn-sm btn-primary" disabled={!dirty || saving} onclick={save}>
			<i class="ph-duotone ph-floppy-disk" aria-hidden="true"></i>
			{m.save()}
		</button>
	</div>
</section>
