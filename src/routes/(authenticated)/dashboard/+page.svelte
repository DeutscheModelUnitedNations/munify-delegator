<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import ConferenceCard from '$lib/components/ConferenceCard.svelte';
	import { type PageData } from './$types';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	onMount(() => {
		if (data.conferences.length === 1) {
			goto(`/dashboard/${data.conferences[0].id}`);
		}
	});
</script>

<Header title="Meine Konferenzen" />
<section class="mt-10 flex flex-wrap gap-4">
	<div
		class="carousel carousel-center bg-base-200 dark:bg-base-300 shadow-inner rounded-box w-full space-x-6 p-6"
	>
		{#each data.conferences.filter((x) => x.status === ('PRE' || 'ACTIVE')) as conference}
			<ConferenceCard {...conference} btnText="Zur Konferenz" baseSlug="/dashboard" />
		{/each}
		<a href="/registration" class="carousel-item max-w-96 w-[90%]">
			<div
				class="w-full h-full flex flex-col justify-center items-center border border-primary border-dashed rounded-xl hover:bg-base-100 hover:shadow-lg hover:scale-[101%] transition-all duration-300 ease-in-out p-4"
			>
				<i class="fa-duotone fa-plus text-5xl text-primary" />
				<p class="text-primary text-lg mt-4">Zu Konferenz anmelden</p>
			</div>
		</a>
	</div>
</section>

<section class="mt-10">
	<h2 class="text-2xl font-bold">Alle Konferenzen</h2>
	<table class="table overflow-x-auto">
		<thead>
			<tr>
				<th>Titel</th>
				<th>Ort</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each data.conferences ?? [] as conference}
				<tr>
					<td>{conference.title}</td>
					<td>{conference.location}</td>
					<td class="flex gap-2">
						<a class="btn btn-sm btn-circle" href={conference.website} target="_blank">
							<i class="fa-duotone fa-info"></i>
						</a>
						<a class="btn btn-sm btn-circle" href="/dashboard/{conference.id}">
							<i class="fa-duotone fa-arrow-right"></i>
						</a>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</section>
