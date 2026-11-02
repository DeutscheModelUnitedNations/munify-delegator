<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import NavMenuButton from '#lib/components/navMenu/NavMenuButton.svelte';
	import { m } from '#lib/paraglide/messages';

	/**
	 * The cleanup entry of the management menu, pinging while suggested school merges wait for a
	 * decision (merged or dismissed). Live: an analysis, a merge or a dismissal updates it. Readers
	 * who may not see the suggestions (everyone but the care team) get an empty list, so for them
	 * it is a plain entry.
	 */
	interface Props {
		conferenceId: string;
		active?: boolean;
	}

	let { conferenceId, active }: Props = $props();

	const open = $derived(
		await client.liveQuery.schoolSuggestions({
			__args: { where: { conferenceId: { eq: conferenceId }, dismissed: { eq: false } } },
			id: true
		})
	);
	const count = $derived(open.length);
</script>

<NavMenuButton
	href="/dashboard/{conferenceId}/team/cleanup"
	icon="fa-broom"
	{active}
	title={m.cleanup()}
	attention={count > 0}
	attentionLabel={m.schoolSuggestionsOpen({ count })}
/>
