<script lang="ts">
	import { getLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';

	interface Props {
		title: string;
		searchPattern?: string;
	}

	let { title, searchPattern }: Props = $props();
</script>

<div class="print-only my-10">
	<h1 class="text-2xl font-bold">{title}</h1>
	<h2 class="text-lg">
		{m.createdOn({
			date: new Date().toLocaleDateString(getLocale()),
			time: new Date().toLocaleTimeString()
		})}
	</h2>
	<h3 class="text-xs">{m.exportFrom({ appName: 'MUNify Delegator' })}</h3>

	{#if searchPattern}
		<h4 class="text-xs">{m.search()}: {searchPattern}</h4>
	{/if}

	<div class="alert alert-warning mt-6">
		<i class="fas fa-diamond-exclamation"></i>
		<p>
			{m.thisExportContainsSensitiveData()}
		</p>
	</div>
</div>
