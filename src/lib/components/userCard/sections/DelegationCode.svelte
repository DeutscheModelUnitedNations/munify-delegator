<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { delegationSchoolsLabel } from '#lib/helpers/delegationSchools';
	import { toast } from 'svelte-sonner';
	import Row from '../ui/Row.svelte';

	/**
	 * The code a delegation's members join with and their schools (it keeps none of its own), as rows
	 * of a `Section`.
	 */
	interface Props {
		delegationId: string;
	}

	let { delegationId }: Props = $props();

	const delegation = $derived(
		await client.liveQuery.delegation({
			__args: { id: delegationId },
			id: true,
			entryCode: true,
			members: { school: { name: true } }
		})
	);

	async function rotateEntryCode() {
		if (!(await confirmDialog({ text: m.confirmRotateCode() }))) return;
		const promise = client.mutate.updateDelegation({
			__args: { id: delegationId, resetEntryCode: true },
			id: true,
			entryCode: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	}

	const copyEntryCode = async () => {
		await navigator.clipboard.writeText(delegation.entryCode);
		toast.success(m.codeCopied());
	};
</script>

<Row icon="graduation-cap" title={m.schoolsOfMembers()}>
	{delegationSchoolsLabel(delegation.members) ?? m.noSchoolGiven()}
</Row>
<Row icon="key" title={m.entryCode()}>
	<span class="font-mono tracking-wider">{delegation.entryCode}</span>
	{#snippet actions()}
		<div class="join">
			<button
				class="btn btn-sm btn-ghost btn-square join-item"
				onclick={copyEntryCode}
				aria-label={m.copy()}
				title={m.copy()}
			>
				<i aria-hidden="true" class="ph-duotone ph-copy"></i>
			</button>
			<button class="btn btn-sm btn-ghost text-primary join-item" onclick={rotateEntryCode}>
				<i aria-hidden="true" class="ph-duotone ph-arrow-counter-clockwise"></i>
				{m.rotateCode()}
			</button>
		</div>
	{/snippet}
</Row>
