<script lang="ts">
	import { untrack } from 'svelte';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import SchoolChangeForm from '#lib/components/form/SchoolChangeForm.svelte';

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
</script>

<DashboardSection
	icon="school"
	title={m.schoolOrInstitution()}
	description={m.supervisorSchoolDescription()}
>
	<div class="card bg-base-100 dark:bg-base-200 max-w-lg p-6 shadow-md">
		<SchoolChangeForm
			current={supervisor.school}
			requireTaintedToSubmit
			save={(choice) =>
				client.mutate.updateConferenceSupervisor({
					__args: { id: supervisorId, ...choice },
					id: true
				})}
		/>
	</div>
</DashboardSection>
