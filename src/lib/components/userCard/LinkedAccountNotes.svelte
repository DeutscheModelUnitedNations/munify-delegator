<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { confirmedLinkedAccounts, linkedAccountNotes } from '$lib/helpers/linkedNotes';
	import { m } from '$lib/paraglide/messages';

	/**
	 * The care notes on accounts confirmed to be the same person as this one: what was noted about
	 * them follows them to the new account. Only readers who may see the pairs (the care team) get
	 * any; for everyone else the lists come back empty.
	 */
	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();

	const user = $derived(
		await client.liveQuery.user({
			__args: { id: userId },
			id: true,
			...confirmedLinkedAccounts
		})
	);
	const notes = $derived(linkedAccountNotes(user));
</script>

{#each notes as linked (linked.name + linked.note)}
	<div class="alert alert-warning alert-soft mt-2 items-start p-2 text-sm">
		<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-error"></i>
		<div>
			<p class="font-bold">{m.linkedAccountNote({ name: linked.name })}</p>
			<p class="whitespace-pre-line">{linked.note}</p>
		</div>
	</div>
{/each}
