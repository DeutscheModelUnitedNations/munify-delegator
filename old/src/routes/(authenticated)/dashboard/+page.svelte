<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import ConferenceCard from '$lib/components/ConferenceCard.svelte';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';
	import { hasConferenceEnded } from '$lib/helper/conferenceStateHelper';

	let { data }: { data: PageData } = $props();
</script>

<Header title={m.myConferences()} />
<section class="mt-10 flex flex-wrap gap-4">
	<div
		class="carousel carousel-center bg-base-200 dark:bg-base-300 shadow-inner rounded-box w-full space-x-6 p-6"
	>
		{#each data.myConferences.filter((conference) => !hasConferenceEnded(conference)) as conference}
			<ConferenceCard {...conference} btnText={m.toConference()} baseSlug="/dashboard" />
		{/each}
		<a href="/registration" class="carousel-item max-w-96 w-[90%]">
			<div
				class="w-full h-full flex flex-col justify-center items-center border border-primary border-dashed rounded-xl hover:bg-base-100 hover:shadow-lg hover:scale-[101%] transition-all duration-300 ease-in-out p-4"
			>
				<i class="fa-duotone fa-plus text-5xl text-primary"></i>
				<p class="text-primary text-lg mt-4">{m.signup()}</p>
			</div>
		</a>
	</div>
</section>

<section class="mt-10">
	<h2 class="text-2xl font-bold">{m.allConferences()}</h2>
	<table class="table overflow-x-auto">
		<thead>
			<tr>
				<th>{m.title()}</th>
				<th>{m.location()}</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each data.myConferences ?? [] as conference}
				<tr>
					<td>{conference.title}</td>
					<td>{conference.location}</td>
					<td class="flex gap-2">
						<a
							class="btn btn-sm btn-circle"
							href={conference.website}
							target="_blank"
							aria-label="Website"
						>
							<i class="fa-duotone fa-info"></i>
						</a>
						<a class="btn btn-sm btn-circle" href="/dashboard/{conference.id}" aria-label="Details">
							<i class="fa-duotone fa-arrow-right"></i>
						</a>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</section>
