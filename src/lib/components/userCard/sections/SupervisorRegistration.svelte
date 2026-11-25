<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import Row from '../ui/Row.svelte';

	/** The code a supervisor's students connect with, as a row of a `Section`. */
	interface Props {
		supervisorId: string;
	}

	let { supervisorId }: Props = $props();

	const supervisor = $derived(
		await client.liveQuery.conferenceSupervisor({
			__args: { id: supervisorId },
			id: true,
			connectionCode: true
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

<Row icon="link" title={m.connectionCode()}>
	<span class="font-mono tracking-wider">{supervisor.connectionCode}</span>
	{#snippet actions()}
		<div class="join">
			<button
				class="btn btn-sm btn-ghost text-primary join-item"
				onclick={copyConnectionCode}
				aria-label={m.copy()}
				title={m.copy()}
			>
				<i aria-hidden="true" class="ph-duotone ph-copy"></i>
			</button>
			<button class="btn btn-sm btn-ghost text-primary join-item" onclick={rotateCode}>
				<i aria-hidden="true" class="ph-duotone ph-arrow-counter-clockwise"></i>
				{m.rotateCode()}
			</button>
		</div>
	{/snippet}
</Row>
