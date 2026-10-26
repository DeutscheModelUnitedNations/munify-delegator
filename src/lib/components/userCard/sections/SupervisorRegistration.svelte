<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast.js';
	import { toast } from 'svelte-sonner';
	import SchoolLine from './SchoolLine.svelte';
	import InfoRow from './InfoRow.svelte';

	/** How a supervisor registered: their school, and the code their students connect with. */
	interface Props {
		supervisorId: string;
	}

	let { supervisorId }: Props = $props();

	const supervisor = $derived(
		await client.liveQuery.conferenceSupervisor({
			__args: { id: supervisorId },
			id: true,
			connectionCode: true,
			school: { id: true, name: true }
		})
	);

	const saveSchool = (choice: { schoolId?: string | null; schoolName?: string | null }) =>
		Promise.resolve(
			client.mutate.updateConferenceSupervisor({
				__args: {
					id: supervisorId,
					schoolId: choice.schoolId ?? null,
					schoolName: choice.schoolName ?? null
				},
				id: true
			})
		);

	const copyConnectionCode = async () => {
		await navigator.clipboard.writeText(supervisor.connectionCode);
		toast.success(m.codeCopied());
	};

	const rotateCode = async () => {
		if (!(await confirmDialog({ text: m.confirmRotateCode() }))) return;
		const promise = client.mutate.rotateSupervisorConnectionCode({
			__args: { id: supervisorId },
			id: true,
			connectionCode: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	};
</script>

<section class="flex flex-col gap-3">
	<h3 class="text-lg font-bold">{m.supervisor()}</h3>
	<div class="bg-base-200 rounded-box divide-base-300 flex flex-col divide-y">
		<SchoolLine school={supervisor.school} save={saveSchool} />
		<InfoRow title={m.connectionCode()} faIcon="link">
			<span class="font-mono text-sm tracking-wider">{supervisor.connectionCode}</span>
			{#snippet actions()}
				<div class="join">
					<button
						class="btn btn-sm join-item"
						onclick={copyConnectionCode}
						aria-label={m.copy()}
						title={m.copy()}
					>
						<i class="fa-sharp-duotone fa-solid fa-copy"></i>
					</button>
					<button class="btn btn-sm join-item" onclick={rotateCode}>
						<i class="fa-sharp-duotone fa-solid fa-arrow-rotate-left"></i>
						{m.rotateCode()}
					</button>
				</div>
			{/snippet}
		</InfoRow>
	</div>
</section>
