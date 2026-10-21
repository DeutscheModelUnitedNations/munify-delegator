<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import SchoolForm from './SchoolForm.svelte';
	import SchoolMetrics from './SchoolMetrics.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const conferenceId = $derived(params.conferenceId);
	const schoolId = $derived(params.schoolId);

	const school = $derived(
		await client.liveQuery.school({ __args: { id: schoolId }, name: true, city: true })
	);
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-1">
		<a href={resolve(`dashboard/${conferenceId}/team/schools`)} class="link link-hover text-sm">
			<i class="fa-sharp-duotone fa-solid fa-arrow-left"></i>
			{m.schools()}
		</a>
		<h2 class="text-2xl font-bold">
			<i class="fa-sharp-duotone fa-solid fa-school"></i>
			{school.name}
		</h2>
		{#if school.city}
			<p class="text-base-content/70">{school.city}</p>
		{/if}
	</div>

	<SchoolMetrics {schoolId} {conferenceId} />

	<section class="card bg-base-100 border-base-200 border shadow-sm">
		<div class="card-body">
			{#key schoolId}
				<SchoolForm {schoolId} />
			{/key}
		</div>
	</section>
</div>
