<script lang="ts">
	import type { PageData } from './$types';
	import Header from '$lib/components/Header.svelte';

	let { data }: { data: PageData } = $props();
</script>

<Header titel={data.conferenceId} />
<div>
	{data.conferenceId}
</div>
