<script lang="ts">
	import type { SightingReview } from '$lib/assignment/sighting';
	import { m } from '$lib/paraglide/messages';

	/** The team's note on one application: always an input, saved when it loses focus. */
	interface Props {
		review: SightingReview | undefined;
		/** Changes the review; shown at once, saved behind the scenes */
		onReview: (change: Partial<SightingReview>) => void;
	}

	let { review, onReview }: Props = $props();

	const saved = $derived(review?.note ?? '');
	let draft = $state('');
	let focused = $state(false);

	// Follow what is stored (another card, another team member), but never under the cursor.
	$effect(() => {
		if (!focused) draft = saved;
	});

	function save() {
		focused = false;
		const note = draft.trim();
		if (note === saved) return;
		onReview({ note: note || null });
	}
</script>

<label class="flex flex-col gap-1">
	<span class="flex items-center gap-2 text-sm font-semibold">
		<i class="fa-sharp-duotone fa-solid fa-note-sticky text-lg"></i>
		{m.assignmentNote()}
	</span>
	<textarea
		class="textarea w-full"
		rows="2"
		bind:value={draft}
		onfocus={() => (focused = true)}
		onblur={save}></textarea>
</label>
