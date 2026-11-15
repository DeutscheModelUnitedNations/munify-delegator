<!--
	@component
	The Slack workspace the conference's team is told in: project management picks one of those
	the system admins added. Renders nothing for anybody else.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { canEditConference } from '#lib/helpers/teamAccess';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { m } from '#lib/paraglide/messages';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const mayPick = $derived(canEditConference(await fetchTeamAccess(conferenceId)));

	const stored = $derived(
		mayPick
			? await Promise.all([
					client.liveQuery.slackWorkspaces({ __args: { conferenceId }, id: true, name: true }),
					client.liveQuery.conferenceSlackWorkspace({ __args: { conferenceId }, id: true })
				])
			: undefined
	);
	const workspaces = $derived(stored?.[0] ?? []);
	const pickedId = $derived(stored?.[1]?.id ?? '');

	async function pick(slackWorkspaceId: string) {
		const promise = Promise.resolve(
			client.mutate.setConferenceSlackWorkspace({
				__args: { conferenceId, slackWorkspaceId: slackWorkspaceId || null }
			})
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	}
</script>

{#if stored}
	<div
		class="bg-base-100 rounded-box border-base-300 flex flex-col gap-2 border p-4"
		data-testid="slack-workspace-card"
	>
		<div class="flex flex-wrap items-center gap-3">
			<i aria-hidden="true" class="ph-duotone ph-slack-logo text-primary"></i>
			<label class="font-semibold" for="slack-workspace">{m.slackWorkspaceOfConference()}</label>
			<span class="flex-1"></span>
			<select
				id="slack-workspace"
				class="select select-sm w-auto max-w-full"
				value={pickedId}
				onchange={(event) => pick(event.currentTarget.value)}
				disabled={workspaces.length === 0}
			>
				<option value="">{m.slackWorkspaceNone()}</option>
				{#each workspaces as workspace (workspace.id)}
					<option value={workspace.id}>{workspace.name}</option>
				{/each}
			</select>
		</div>
		<p class="text-sm">
			{workspaces.length === 0
				? m.slackWorkspaceNoneAvailable()
				: m.slackWorkspaceOfConferenceDescription()}
		</p>
	</div>
{/if}
