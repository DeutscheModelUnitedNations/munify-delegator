<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import DiscussionPointsBox from './DiscussionPointsBox.svelte';

	/**
	 * The points for discussion of an agenda item, live, as the highlighted box; nothing without an
	 * agenda item or points. For the paper forms, while the author picks the agenda item.
	 */
	let { agendaItemId, compact = false }: { agendaItemId?: string | null; compact?: boolean } =
		$props();

	const item = $derived(
		agendaItemId
			? await client.liveQuery.committeeAgendaItem({
					__args: { id: agendaItemId },
					discussionPoints: true
				})
			: undefined
	);
	const points = $derived(item?.discussionPoints ?? []);
</script>

<DiscussionPointsBox {points} {compact} />
