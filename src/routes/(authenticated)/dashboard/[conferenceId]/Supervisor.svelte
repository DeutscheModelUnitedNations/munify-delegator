<script lang="ts">
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	let { data }: { data: PageData } = $props();

	const stats = $derived([
		{
			icon: 'users',
			title: 'Mitglieder',
			value: data.delegationData?.members?.length,
			desc: 'in der Delegation'
		},
		{
			icon: 'list-check',
			title: 'Aufgaben',
			value: todos
				? `${Math.floor((todos.filter((x) => x.completed).length / todos.length) * 100)} %`
				: undefined,
			desc: 'für Anmeldung erledigt'
		}
	]);
</script>

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.overview()}</h2>
	<GenericWidget content={stats} />
</section>
