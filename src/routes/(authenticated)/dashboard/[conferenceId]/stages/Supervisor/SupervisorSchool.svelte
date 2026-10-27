<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import SchoolLine from '#lib/components/userCard/sections/SchoolLine.svelte';

	/** The school the supervisor comes from, which they may change at any time. */
	interface Props {
		supervisorId: string;
	}

	let { supervisorId }: Props = $props();

	const supervisor = $derived(
		await client.liveQuery.conferenceSupervisor({
			__args: { id: supervisorId },
			school: { id: true, name: true, city: true }
		})
	);
</script>

<SchoolLine
	school={supervisor.school}
	hint={m.supervisorSchoolDescription()}
	save={(choice) =>
		client.mutate.updateConferenceSupervisor({
			__args: { id: supervisorId, ...choice },
			id: true
		})}
/>
