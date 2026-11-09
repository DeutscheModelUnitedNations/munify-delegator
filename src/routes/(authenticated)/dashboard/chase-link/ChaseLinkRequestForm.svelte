<script lang="ts">
	import { defaults } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import Form from '#lib/components/form/Form.svelte';
	import FormTextInput from '#lib/components/form/FormTextInput.svelte';
	import { mutationForm } from '#lib/components/form/mutationForm';
	import { chaseLinkRequestSchema } from '#lib/schemata/chaseLink';

	/** Asks a CHASE instance to link with this one (`docs/plans/chase-link.md`). */
	const form = mutationForm({
		initial: defaults({ chaseUrl: '' }, zod4Client(chaseLinkRequestSchema)),
		validators: zod4Client(chaseLinkRequestSchema),
		save: ({ chaseUrl }) =>
			Promise.resolve(client.mutate.requestChaseLink({ __args: { chaseUrl } }))
	});
	let { submitting } = $derived(form);
</script>

<Form {form} showSubmitButton={false}>
	<FormTextInput
		{form}
		name="chaseUrl"
		type="url"
		label={m.chaseLinkUrl()}
		description={m.chaseLinkUrlHint()}
		placeholder="https://chase.example.org"
	/>
	<button type="submit" class="btn btn-primary mt-4 self-start" disabled={$submitting}>
		<i aria-hidden="true" class="ph-duotone ph-link"></i>
		{m.chaseLinkSendRequest()}
	</button>
</Form>
