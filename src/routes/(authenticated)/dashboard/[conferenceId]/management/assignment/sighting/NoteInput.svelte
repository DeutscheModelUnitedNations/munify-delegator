<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { reviewArgs, type SightingReview } from '$lib/assignment/sighting';
	import { m } from '$lib/paraglide/messages';
	import { toastError } from '../toastError';

	/** The team's note on one application: always an input, saved when it loses focus. */
	interface Props {
		kind: 'delegation' | 'single';
		id: string;
		review: SightingReview | undefined;
	}

	let { kind, id, review }: Props = $props();

	const saved = $derived(review?.note ?? '');
	let draft = $state('');
	let focused = $state(false);

	// Follow what is stored (another card, another team member), but never under the cursor.
	$effect(() => {
		if (!focused) draft = saved;
	});

	async function save() {
		focused = false;
		const note = draft.trim();
		if (note === saved) return;
		await Promise.resolve(
			client.mutate.setAssignmentReview({
				__args: reviewArgs(kind, id, review, { note: note || null }),
				evaluation: true
			})
		).catch(toastError);
	}
</script>

<label class="flex flex-col gap-1">
	<span class="flex items-center gap-2 text-sm font-semibold">
		<i class="fa-duotone fa-note-sticky text-lg"></i>
		{m.assignmentNote()}
	</span>
	<textarea
		class="textarea w-full"
		rows="2"
		bind:value={draft}
		onfocus={() => (focused = true)}
		onblur={save}></textarea>
</label>
