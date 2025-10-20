<script lang="ts">
	import { ConferenceSeedingSchema } from '$lib/seeding/seedSchema';
	import { m } from '$lib/paraglide/messages';
	import { z } from 'zod';
	import { graphql } from '$houdini';
	import toast from 'svelte-french-toast';
	import { genericPromiseToastMessages } from '$lib/services/toast';

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

	const seedNewConferenceMutation = graphql(`
		mutation seedNewConferenceMutation($data: JSONObject!) {
			seedNewConference(data: $data) {
				success
				conferenceId
			}
		}
	`);

	const seedNewConference = () => {
		if (!seedData) return;

		toast.promise(
			seedNewConferenceMutation.mutate({
				data: seedData
			}),
			genericPromiseToastMessages
		);
	};
</script>

<div class="flex w-full flex-col items-center gap-4 p-10">
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
