<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import { confirmedLinkedAccounts, linkedAccountNotes } from '#lib/helpers/linkedNotes.js';
	import { m } from '#lib/paraglide/messages.js';
	import GlobalNotes from './GlobalNotes.svelte';

	/**
	 * Everything the care team noted about the person: the note on this account, and those on
	 * accounts confirmed to be the same person. Shown in the header so it is never missed; only the
	 * care team reads the notes, so for everyone else this stays empty.
	 */
	interface Props {
		userId: string;
		/** Whether the editor for this account's note is open */
		editing: boolean;
	}

	let { userId, editing = $bindable(false) }: Props = $props();

	const user = $derived(
		await client.liveQuery.user({
			__args: { id: userId },
			id: true,
			globalNotes: true,
			...confirmedLinkedAccounts
		})
	);
	const own = $derived(user.globalNotes?.trim());
	const linked = $derived(linkedAccountNotes(user));
</script>

{#if own}
	<div class="alert alert-warning alert-soft items-start p-2 text-sm">
		<i class="fa-sharp-duotone fa-solid fa-note-sticky"></i>
		<div class="flex-1">
			<p class="font-bold">{m.globalNotes()}</p>
			<p class="whitespace-pre-line">{own}</p>
		</div>
		<button
			class="btn btn-ghost btn-xs btn-square"
			onclick={() => (editing = true)}
			aria-label={m.editGlobalNotes()}
			title={m.editGlobalNotes()}
		>
			<i class="fa-sharp-duotone fa-solid fa-pen"></i>
		</button>
	</div>
{/if}

{#each linked as account (account.name + account.note)}
	<div class="alert alert-warning alert-soft items-start p-2 text-sm">
		<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-error"></i>
		<div>
			<p class="font-bold">{m.linkedAccountNote({ name: account.name })}</p>
			<p class="whitespace-pre-line">{account.note}</p>
		</div>
	</div>
{/each}

<GlobalNotes globalNotes={user.globalNotes ?? ''} bind:open={editing} id={user.id} />
