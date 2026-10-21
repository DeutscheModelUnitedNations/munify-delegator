<script lang="ts">
	import { untrack } from 'svelte';
	import { defaults, superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import { schoolChoiceSchema } from '#lib/schemata/schoolChoice.js';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import Form from '#lib/components/form/Form.svelte';
	import SchoolPicker from '#lib/components/form/SchoolPicker.svelte';

	/** The school the supervisor comes from, which they may change at any time. */
	interface Props {
		supervisorId: string;
	}

	let { supervisorId }: Props = $props();

	// Seeded once: the form's initial value, which a live re-read would overwrite while typing.
	const supervisor = await client.query.conferenceSupervisor({
		__args: { id: untrack(() => supervisorId) },
		school: { id: true, name: true }
	});

	const form = superForm(
		defaults(
			{ schoolId: supervisor.school?.id ?? null, schoolName: supervisor.school?.name ?? '' },
			zod4Client(schoolChoiceSchema)
		),
		{
			SPA: true,
			resetForm: false,
			validationMethod: 'oninput',
			validators: zod4Client(schoolChoiceSchema),
			onError: (e) => toast.error(e.result.error.message),
			async onUpdate({ form: validated }) {
				if (!validated.valid) return;
				const promise = client.mutate.updateConferenceSupervisor({
					__args: { id: supervisorId, ...validated.data },
					id: true
				});
				toast.promise(promise, genericPromiseToastMessages);
				await promise;
			}
		}
	);
</script>

<DashboardSection
	icon="school"
	title={m.schoolOrInstitution()}
	description={m.supervisorSchoolDescription()}
>
	<div class="card bg-base-100 dark:bg-base-200 max-w-lg p-6 shadow-md">
		<Form {form}>
			<SchoolPicker {form} name="schoolName" idName="schoolId" />
		</Form>
	</div>
</DashboardSection>
