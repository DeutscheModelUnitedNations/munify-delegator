<script lang="ts">
	import { untrack } from 'svelte';
	import { defaults } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { schoolChoiceSchema } from '#lib/schemata/schoolChoice';
	import Form from './form/Form.svelte';
	import SchoolPicker from './form/SchoolPicker.svelte';
	import { mutationForm } from './form/mutationForm';

	/**
	 * Joining a delegation: the newcomer names their own school, filled in with the head delegate's,
	 * since most join a delegation of their own school.
	 */
	interface Props {
		conferenceId: string;
		entryCode: string;
		headDelegateSchool: { id: string; name: string } | null;
	}

	let { conferenceId, entryCode, headDelegateSchool }: Props = $props();

	const initial = untrack(() => headDelegateSchool);
	const form = mutationForm(
		defaults(
			{ schoolId: initial?.id ?? null, schoolName: initial?.name ?? '' },
			zod4Client(schoolChoiceSchema)
		),
		zod4Client(schoolChoiceSchema),
		async (school) => {
			await client.mutate.createDelegationMember({
				__args: { entryCode, conferenceId, ...school },
				id: true
			});
			await goto(resolve('/(authenticated)/dashboard/[conferenceId]', { conferenceId }));
		}
	);
	const { submitting } = form;
</script>

<Form {form} showSubmitButton={false} requireTaintedToSubmit={false} class="mt-6 w-full max-w-md">
	<SchoolPicker
		{form}
		name="schoolName"
		idName="schoolId"
		label={m.whichSchoolAreYouFrom()}
		description={m.joinDelegationSchoolDescription()}
	/>
	<button class="btn btn-primary mt-4 self-center" type="submit" disabled={$submitting}>
		{m.confirm()}
	</button>
</Form>
