<script>
	import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import * as m from '$lib/paraglide/messages';

	let { data } = $props();
</script>

<ManagementHeader title={m.adminSettings()} logoutUrl={data.logoutUrl} />
