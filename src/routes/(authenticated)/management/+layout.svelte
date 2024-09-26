<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';

	import type { PageData } from './$types';

	let { data, children }: { data: PageData; children: any } = $props();
</script>

<svelte:head>
	<title>MUNify Delegator – {m.admininstration()}</title>
</svelte:head>

{@render children()}
