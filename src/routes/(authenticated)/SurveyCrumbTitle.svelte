<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';

	let { surveyId }: { surveyId: string } = $props();

	// Primitive in, own query out: the crumb is the only thing that waits for the title.
	const survey = $derived(
		await client.liveQuery.surveyQuestion({ __args: { id: surveyId }, title: true })
	);
</script>

{survey?.title ?? m.details()}
