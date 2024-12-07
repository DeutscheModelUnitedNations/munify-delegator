<script lang="ts">
	import ConferenceCard from '$lib/components/ConferenceCard/ConferenceCard.svelte';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';

	let { data }: { data: PageData } = $props();
</script>

<div class=" w-full">
	<section class="mt-10 flex flex-wrap gap-4">
		<div
			class="carousel carousel-center w-full space-x-6 rounded-box bg-base-200 p-6 shadow-inner dark:bg-base-300"
		>
			{#each data.conferences as conference}
				<ConferenceCard {conference} btnText={m.toConference()} baseSlug="/dashboard" />
			{/each}
			<a href="/registration" class="carousel-item w-[90%] max-w-96">
				<div
					class="border-primary flex h-full w-full flex-col items-center justify-center rounded-xl border border-dashed p-4 transition-all duration-300 ease-in-out hover:scale-[101%] hover:bg-base-100 hover:shadow-lg"
				>
					<i class="fa-duotone fa-plus text-primary text-5xl"></i>
					<p class="text-primary mt-4 text-lg">{m.signup()}</p>
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
				{#each data.conferences as conference}
					<tr>
						<td>{conference.title}</td>
						<td>{conference.location}</td>
						<td class="flex gap-2">
							<a
								class="btn btn-circle btn-sm"
								href={conference.website}
								target="_blank"
								aria-label="Website"
							>
								<i class="fa-duotone fa-info"></i>
							</a>
							<a
								class="btn btn-circle btn-sm"
								href="/dashboard/{conference.id}"
								aria-label="Details"
							>
								<i class="fa-duotone fa-arrow-right"></i>
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</div>
