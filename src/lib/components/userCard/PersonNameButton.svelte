<script lang="ts">
	import PersonName from './PersonName.svelte';
	import { openUserCard } from './userCardState.svelte';

	/**
	 * A person's name that opens their user card: the keyboard's way into a row whose `onclick`
	 * (`rowClick`) opens the same card for the mouse.
	 */
	interface Props {
		user: { id: string; givenName?: string | null; familyName?: string | null };
		isHeadDelegate?: boolean;
	}

	let { user, isHeadDelegate = false }: Props = $props();
</script>

<button
	type="button"
	class="link link-hover cursor-pointer text-left"
	onclick={() => openUserCard(user.id)}
>
	<PersonName givenName={user.givenName} familyName={user.familyName} {isHeadDelegate} />
</button>
