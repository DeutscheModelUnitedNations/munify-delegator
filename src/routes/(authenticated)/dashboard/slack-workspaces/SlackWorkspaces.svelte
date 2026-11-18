<!--
	@component
	The list of Slack workspaces with the form to add one, rename it, replace its bot token or
	remove it. A token is only ever written, never shown.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { m } from '#lib/paraglide/messages';

	const workspaces = $derived(
		await client.liveQuery.slackWorkspaces({
			id: true,
			name: true,
			slackTeamName: true,
			conferenceCount: true
		})
	);

	let name = $state('');
	let botToken = $state('');
	let saving = $state(false);
	/** The workspace whose token is being replaced. */
	let replacingId = $state<string>();
	let newToken = $state('');

	const messageOf = (error: unknown) => (error instanceof Error ? error.message : m.genericError());

	async function run(work: () => Promise<unknown>) {
		saving = true;
		try {
			await work();
			toast.success(m.saved());
			return true;
		} catch (error) {
			toast.error(messageOf(error));
			return false;
		} finally {
			saving = false;
		}
	}

	async function add(event: SubmitEvent) {
		event.preventDefault();
		const added = await run(() =>
			Promise.resolve(client.mutate.createSlackWorkspace({ __args: { name, botToken } }))
		);
		if (added) {
			name = '';
			botToken = '';
		}
	}

	async function rename({ id, to }: { id: string; to: string }) {
		await run(() =>
			Promise.resolve(client.mutate.updateSlackWorkspace({ __args: { id, name: to } }))
		);
	}

	async function replaceToken(event: SubmitEvent) {
		event.preventDefault();
		const id = replacingId;
		if (!id) return;
		const replaced = await run(() =>
			Promise.resolve(client.mutate.updateSlackWorkspace({ __args: { id, botToken: newToken } }))
		);
		if (replaced) {
			replacingId = undefined;
			newToken = '';
		}
	}

	async function remove(workspace: { id: string; name: string; conferenceCount: number | null }) {
		const confirmed = await confirmDialog({
			text: m.slackWorkspaceDeleteConfirm({
				name: workspace.name,
				count: workspace.conferenceCount ?? 0
			}),
			danger: true
		});
		if (!confirmed) return;
		await run(() =>
			Promise.resolve(client.mutate.deleteSlackWorkspace({ __args: { id: workspace.id } }))
		);
	}
</script>

<section class="flex flex-col gap-3" data-testid="slack-workspaces">
	{#if workspaces.length === 0}
		<div class="alert">{m.slackWorkspacesEmpty()}</div>
	{/if}
	{#each workspaces as workspace (workspace.id)}
		<div class="bg-base-100 rounded-box border-base-300 flex flex-col gap-3 border p-4">
			<div class="flex flex-wrap items-center gap-3">
				<i aria-hidden="true" class="ph-duotone ph-slack-logo text-primary text-xl"></i>
				<input
					class="input input-sm max-w-xs flex-1"
					aria-label={m.slackWorkspaceName()}
					value={workspace.name}
					onchange={(event) => rename({ id: workspace.id, to: event.currentTarget.value })}
				/>
				<span class="text-base-content/70 text-sm">
					{m.slackWorkspaceTeam({ team: workspace.slackTeamName })}
				</span>
				<span class="badge badge-ghost badge-sm">
					{m.slackWorkspaceConferences({ count: workspace.conferenceCount ?? 0 })}
				</span>
				<span class="flex-1"></span>
				<button
					class="btn btn-ghost btn-sm"
					onclick={() => {
						replacingId = replacingId === workspace.id ? undefined : workspace.id;
						newToken = '';
					}}
				>
					<i aria-hidden="true" class="ph-duotone ph-key"></i>
					{m.slackWorkspaceReplaceToken()}
				</button>
				<button
					class="btn btn-ghost btn-sm text-error"
					onclick={() => remove(workspace)}
					disabled={saving}
				>
					<i aria-hidden="true" class="ph-duotone ph-trash"></i>
					{m.delete()}
				</button>
			</div>
			{#if replacingId === workspace.id}
				<form class="flex flex-wrap items-end gap-3" onsubmit={replaceToken}>
					<label class="flex flex-1 flex-col gap-1 text-sm">
						{m.slackBotToken()}
						<input
							class="input w-full font-mono"
							type="password"
							autocomplete="off"
							placeholder="xoxb-…"
							required
							bind:value={newToken}
						/>
					</label>
					<button class="btn btn-primary" disabled={saving}>{m.save()}</button>
				</form>
			{/if}
		</div>
	{/each}
</section>

<form
	class="bg-base-100 rounded-box border-base-300 flex flex-col gap-4 border p-4"
	onsubmit={add}
	data-testid="slack-workspace-add"
>
	<h2 class="text-lg font-bold">{m.slackWorkspaceAdd()}</h2>
	<p class="text-base-content/70 text-sm">{m.slackWorkspaceAddDescription()}</p>
	<div class="grid gap-3 sm:grid-cols-2">
		<label class="flex flex-col gap-1 text-sm">
			{m.slackWorkspaceName()}
			<input class="input w-full" required maxlength="80" placeholder="MUN-SH" bind:value={name} />
		</label>
		<label class="flex flex-col gap-1 text-sm">
			{m.slackBotToken()}
			<input
				class="input w-full font-mono"
				type="password"
				autocomplete="off"
				placeholder="xoxb-…"
				required
				bind:value={botToken}
			/>
		</label>
	</div>
	<div>
		<button class="btn btn-primary" disabled={saving}>
			<i aria-hidden="true" class="ph-duotone ph-plus"></i>
			{m.slackWorkspaceAdd()}
		</button>
	</div>
</form>
