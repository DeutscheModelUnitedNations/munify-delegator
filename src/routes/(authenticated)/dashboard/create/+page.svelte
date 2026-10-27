<script lang="ts">
	import { ConferenceSeedingSchema } from '#lib/seeding/seedSchema.js';
	import { m } from '#lib/paraglide/messages.js';
	import { z } from 'zod';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';

	let rawFile = $state<File | null>(null);
	let validationErrors = $state<string | null>(null);
	let seedData = $state<z.infer<typeof ConferenceSeedingSchema> | null>(null);

	$effect(() => {
		if (rawFile) {
			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					const data = JSON.parse(e.target?.result as string);
					const validation = ConferenceSeedingSchema.safeParse(data);
					if (validation.success) {
						seedData = validation.data;
						validationErrors = null;
					} else {
						validationErrors = z.prettifyError(validation.error);
						seedData = null;
					}
				} catch (error) {
					validationErrors = (error as Error).message;
					seedData = null;
				}
			};
			reader.readAsText(rawFile);
		}
	});

	const seedNewConference = async () => {
		if (!seedData) return;

		const promise = Promise.resolve(
			client.mutate.seedNewConference({ __args: { data: seedData }, id: true })
		);
		toast.promise(promise, genericPromiseToastMessages);

		// The toast already reports a failure.
		const conference = await promise.catch(() => undefined);
		if (!conference) return;
		await goto(
			resolve('/(authenticated)/dashboard/[conferenceId]', {
				conferenceId: conference.id
			})
		);
	};
</script>

<div class="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 p-4 md:p-10">
	<header class="flex w-full flex-col gap-2">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h1 class="text-3xl font-bold">{m.createConference()}</h1>
			<a href={resolve('/(authenticated)/dashboard/conference-request')} class="btn btn-ghost">
				<i class="fa-sharp-duotone fa-solid fa-file-pen"></i>
				{m.conferenceRequest()}
			</a>
		</div>
		<p class="text-base-content/70">{m.createConferenceDescription()}</p>
	</header>

	<section class="bg-base-200 w-full rounded-box p-4">
		<h2 class="mb-2 font-bold">{m.createConferenceWorkflow()}</h2>
		<ol class="list-decimal space-y-1 pl-5">
			<li>{m.createConferenceStepRequest()}</li>
			<li>{m.createConferenceStepUpload()}</li>
			<li>{m.createConferenceStepCreate()}</li>
		</ol>
	</section>

	<div class="alert alert-info w-full">
		<i class="fa-sharp-duotone fa-solid fa-circle-info"></i>
		<span>{m.createConferenceEditHint()}</span>
	</div>

	<input
		type="file"
		class="file-input w-full"
		onchange={(e) => {
			rawFile = e.currentTarget.files?.[0] ?? null;
		}}
		accept=".json"
	/>

	{#if validationErrors}
		<div class="alert alert-error">
			<div class="flex flex-col">
				<h3 class="font-bold">{m.validationFailed()}</h3>
				<pre class="w-full overflow-auto break-all whitespace-pre-wrap">{validationErrors}</pre>
			</div>
		</div>
	{/if}

	{#if seedData}
		<div class="alert alert-success">
			<h3 class="font-bold">{m.validationSuccessful()}</h3>
		</div>
		<button class="btn btn-primary" onclick={seedNewConference}>{m.createConference()}</button>
	{/if}
</div>
