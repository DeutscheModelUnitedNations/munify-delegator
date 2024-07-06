<script lang="ts">
	import type { PageData } from './$types';
	import Header from '$lib/components/Header.svelte';

	export let data: PageData;
</script>

<Header titel={data.conferenceId} />
<div>
	{data.conferenceId}
</div>
