<script lang="ts">
	import type { PageData } from './$types';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import PlainCard from '$lib/components/PlainCard.svelte';

	let { data }: { data: PageData } = $props();
	const roles = $derived(
		await client.liveQuery.customConferenceRoles({
			__args: { where: { conferenceId: { eq: data.conferenceId } } },
			id: true,
			name: true,
			description: true,
			fontAwesomeIcon: true
		})
	);
</script>

<div class="flex min-h-screen w-full flex-col items-center p-4">
	<hero class="my-20 text-center">
		<h1 class="mb-3 text-3xl tracking-wider uppercase">{m.individualApplication()}</h1>
		<p class="max-ch-md">
			{m.individualApplicationDescription2()}
		</p>
	</hero>

	<main>
		<section
			class="grid grid-cols-1 gap-4 {roles.length > 1 ? 'md:grid-cols-2' : ''} {roles.length > 2
				? 'lg:grid-cols-3'
				: ''}"
		>
			{#each roles as { description, fontAwesomeIcon, id, name }}
				<PlainCard
					title={name}
					{description}
					fontAwesomeIcon={fontAwesomeIcon ?? 'fa-user-tie'}
					link={`./individual/${id}`}
				/>
			{/each}
		</section>
	</main>
</div>
