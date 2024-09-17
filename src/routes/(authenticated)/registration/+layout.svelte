<script lang="ts">
	import ProfileButtonAbsolute from '$lib/components/ProfileButton/ProfileButtonAbsolute.svelte';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	let { data, children }: { data: LayoutData; children: Snippet } = $props();
</script>

<ProfileButtonAbsolute logoutUrl={data.logoutUrl} />
{@render children()}
