<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { page } from '$app/state';
	import EntryCode from '../Common/EntryCode.svelte';

	interface Props {
		conferenceId: string;
		supervisorId: string;
	}

	let { conferenceId, supervisorId }: Props = $props();

	const supervisor = $derived(
		await client.liveQuery.conferenceSupervisor({
			__args: { id: supervisorId },
			connectionCode: true
		})
	);

	const connectionLink = $derived(
		`${page.url.origin}/dashboard/${conferenceId}/connectSupervisor?code=${supervisor.connectionCode}`
	);

	const rotate = async () => {
		const promise = client.mutate.rotateSupervisorConnectionCode({
			__args: { id: supervisorId },
			id: true,
			connectionCode: true
		});
		toast.promise(promise, { ...genericPromiseToastMessages, success: m.codeRotated() });
		await promise;
	};
</script>

<DashboardSection
	icon="users-line"
	title={m.connectWithStudents()}
	description={m.connectWithStudentsDescription()}
>
	<EntryCode
		entryCode={supervisor.connectionCode}
		referralLink={connectionLink}
		userHasRotationPermission={true}
		rotationFn={rotate}
	/>
</DashboardSection>
