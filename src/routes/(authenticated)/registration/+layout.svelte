<script lang="ts">
	import ProfileButtonAbsolute from '$lib/components/ProfileButton/ProfileButtonAbsolute.svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import * as m from '$lib/paraglide/messages.js';
	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<svelte:head>
	<title>MUNify Delegator – {m.registration()}</title>
</svelte:head>

<ProfileButtonAbsolute />
{@render children()}
