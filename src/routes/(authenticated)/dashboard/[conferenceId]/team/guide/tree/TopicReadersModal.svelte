<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import Modal from '#lib/components/Modal.svelte';
	import type { TopicReaders } from '#lib/guide/outline';

	/**
	 * Who reads the topic overview: non-state actors, each custom role, supervisors. Delegates are
	 * not offered: they read their own committee's section.
	 */
	interface Props {
		open: boolean;
		readers: TopicReaders;
		roles: readonly { id: string; name: string }[];
		onChange: (readers: TopicReaders) => void;
	}

	let { open = $bindable(), readers, roles, onChange }: Props = $props();

	const toggleRole = (roleId: string, on: boolean) =>
		onChange({
			...readers,
			roleIds: on
				? [...new Set([...readers.roleIds, roleId])]
				: readers.roleIds.filter((id) => id !== roleId)
		});
</script>

<Modal bind:open title={m.guideTopicOverviewReaders()}>
	<fieldset class="fieldset" data-testid="guide-topic-readers">
		<legend class="fieldset-legend">{m.guideTopicOverviewReadersLegend()}</legend>
		<label class="label">
			<input
				type="checkbox"
				class="checkbox checkbox-sm"
				checked={readers.nonStateActors}
				onchange={(event) => onChange({ ...readers, nonStateActors: event.currentTarget.checked })}
			/>
			{m.guideAudienceNonStateActors()}
		</label>
		{#each roles as role (role.id)}
			<label class="label">
				<input
					type="checkbox"
					class="checkbox checkbox-sm"
					checked={readers.roleIds.includes(role.id)}
					onchange={(event) => toggleRole(role.id, event.currentTarget.checked)}
				/>
				{role.name}
			</label>
		{/each}
		<label class="label">
			<input
				type="checkbox"
				class="checkbox checkbox-sm"
				checked={readers.supervisors}
				onchange={(event) => onChange({ ...readers, supervisors: event.currentTarget.checked })}
			/>
			{m.guideAudienceSupervisors()}
		</label>
	</fieldset>
	<p class="text-sm opacity-70">{m.guideTopicOverviewReadersHint()}</p>
	{#snippet action()}
		<button class="btn" type="button" onclick={() => (open = false)}>{m.close()}</button>
	{/snippet}
</Modal>
