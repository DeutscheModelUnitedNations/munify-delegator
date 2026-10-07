<script lang="ts">
	import type { Snippet } from 'svelte';
	import NavMenu from '$lib/components/navMenu/NavMenu.svelte';
	import SideNavigationDrawer from '$lib/components/SideNavigationDrawer.svelte';
	import UserCardDrawer from '$lib/components/userCard/UserCardDrawer.svelte';

	/**
	 * A conference area with its own side navigation (`nav`, the menu's entries) beside the page,
	 * and the user card drawer its pages open.
	 */
	interface Props {
		conferenceId: string;
		expanded: boolean;
		nav: Snippet;
		children: Snippet;
	}

	let { conferenceId, expanded = $bindable(), nav, children }: Props = $props();
</script>

<div class="flex min-w-0 grow basis-0 overflow-hidden">
	<SideNavigationDrawer bind:expanded>
		<NavMenu>
			{@render nav()}
		</NavMenu>
	</SideNavigationDrawer>

	<div class="flex h-full min-w-0 grow flex-col px-3">
		{@render children()}
	</div>
</div>

<UserCardDrawer {conferenceId} />
