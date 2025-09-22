<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { addToPanel } from 'svelte-inspect-value';
	import type { PageData } from './$houdini';
	import { cache, graphql } from '$houdini';
	import Form from '$lib/components/Form/Form.svelte';
	import FormTextInput from '$lib/components/Form/FormTextInput.svelte';
	import FormTextArea from '$lib/components/Form/FormTextArea.svelte';
	import FormSelect from '$lib/components/Form/FormSelect.svelte';
	import toast from 'svelte-french-toast';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { superForm } from 'sveltekit-superforms';
	import { AddAgendaItemFormSchema } from './form-schema';
	import { invalidateAll } from '$app/navigation';
	import { genericPromiseToastMessages } from '$lib/services/toast';

	let { data }: { data: PageData } = $props();

	let query = $derived(data.data);
	let committees = $derived(query.findManyCommittees);

	let form = superForm(data.addAgendaItemForm, {
		resetForm: true,
		validationMethod: 'oninput',
		validators: zodClient(AddAgendaItemFormSchema),
		onError(e) {
			toast.error(e.result.error.message);
		},
		onResult(_e) {
			cache.markStale();
			invalidateAll();
		}
	});

	const DeleteAgendaItemMutation = graphql(`
		mutation DeleteAgendaItemMutation($id: String!) {
			deleteOneAgendaItem(where: { id: $id }) {
				id
			}
		}
	`);
</script>

<div class="flex w-full flex-col gap-10 p-10">
	<h1 class="text-2xl">
		{m.committeesAndAgendaItems()}
	</h1>

	{#each committees as committee}
		{@const agendaItems = committee.agendaItems}
		<div class="card bg-base-200 shadow-md">
			<div class="card-body">
				<h3 class="text-xl font-bold">{committee.name} ({committee.abbreviation})</h3>
				{#each agendaItems as item}
					<div class="flex items-center gap-2 rounded-md bg-base-300 px-4 py-2">
						<div class="flex w-full flex-1 flex-col gap-2">
							<h4>{item.title}</h4>
							{#if item.teaserText}
								<p class="whitespace-pre-wrap text-xs">{item.teaserText}</p>
							{/if}
						</div>
						<button
							class="btn btn-ghost btn-error"
							aria-label="Delete"
							onclick={async () => {
								await toast.promise(
									DeleteAgendaItemMutation.mutate({ id: item.id }),
									genericPromiseToastMessages
								);
								cache.markStale();
								invalidateAll();
							}}
						>
							<i class="fas fa-xmark"></i>
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/each}

	<h2 class="mt-10 text-xl font-bold">{m.createNewAgendaItem()}</h2>

	<Form {form} showSubmitButton>
		<FormSelect
			{form}
			name="committeeId"
			label={m.committee()}
			options={committees.map((x) => ({ label: x.abbreviation, value: x.id }))}
		/>
		<FormTextInput {form} name="title" label={m.title()} />
		<FormTextArea {form} name="teaserText" label={m.teaserText()} />
	</Form>
</div>
