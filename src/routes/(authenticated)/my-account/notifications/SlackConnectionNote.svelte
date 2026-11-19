<!--
	@component
	Whether Slack reaches the caller in a conference: the workspace it picked, and whether their
	account's address is known there. Asked apart from the settings, since it asks Slack.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';

	interface Props {
		conferenceId: string;
		workspaceName: string | null;
	}

	let { conferenceId, workspaceName }: Props = $props();

	// Asked apart from the settings and not live: it asks Slack, which a flipped switch should not.
	async function fetchConnection(id: string) {
		const connection = await client.query.mySlackConnection({ __args: { conferenceId: id } });
		return connection ? String(connection) : undefined;
	}

	const connection = $derived(workspaceName ? await fetchConnection(conferenceId) : undefined);
	let sending = $state(false);

	async function sendTest() {
		sending = true;
		try {
			// a scalar answer comes wrapped: read it as the plain value it is
			const result = String(await client.mutate.sendSlackTestMessage({ __args: { conferenceId } }));
			if (result === 'CONNECTED') toast.success(m.slackTestSent());
			else toast.error(result === 'NOT_FOUND' ? m.slackNotFoundShort() : m.slackUnavailable());
		} catch {
			toast.error(m.slackUnavailable());
		} finally {
			sending = false;
		}
	}
</script>

<div
	class="text-base-content/70 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
	data-testid="slack-connection"
	data-connection={connection ?? 'NONE'}
>
	<i aria-hidden="true" class="ph-duotone ph-slack-logo text-base"></i>
	{#if !workspaceName}
		<span class="flex-1">{m.slackNoWorkspaceNote()}</span>
	{:else if connection === 'CONNECTED'}
		<span class="flex-1">{m.slackConnectedNote({ workspace: workspaceName })}</span>
		<button class="btn btn-ghost btn-xs" onclick={sendTest} disabled={sending}>
			<i aria-hidden="true" class="ph-duotone ph-paper-plane-tilt"></i>
			{m.slackSendTest()}
		</button>
	{:else if connection === 'NOT_FOUND'}
		<span class="flex-1">{m.slackNotFoundNote({ workspace: workspaceName })}</span>
	{:else}
		<span class="flex-1">{m.slackUnavailableNote({ workspace: workspaceName })}</span>
	{/if}
</div>
