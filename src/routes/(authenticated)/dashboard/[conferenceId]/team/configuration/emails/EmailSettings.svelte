<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import type { EmailkindEnum } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import { toast } from 'svelte-sonner';
	import Modal from '#lib/components/Modal.svelte';
	import { EMAIL_GROUPS } from '#lib/helpers/emailKinds.js';
	import { emailGroupTitle, emailKindTexts } from './emailKindTexts';
	import EmailKindCard from './EmailKindCard.svelte';
	import EmailLog from './EmailLog.svelte';

	interface Props {
		conferenceId: string;
		/** Participant care and project management; everybody else reads only. */
		canManage: boolean;
	}

	let { conferenceId, canManage }: Props = $props();

	const settings = $derived(
		await client.liveQuery.conferenceEmailSettings({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			kind: true,
			enabled: true
		})
	);
	const enabled = $derived(
		new Set(settings.filter((setting) => setting.enabled).map((setting) => setting.kind))
	);

	// The counts are worked out from the log, not live: asked again after each change.
	let revision = $state(0);
	const stats = $derived(
		canManage
			? await client.query.emailStats({
					__args: { conferenceId, revision },
					kind: true,
					sent: true,
					failed: true,
					skipped: true
				})
			: []
	);
	const statsOf = (kind: EmailkindEnum) => stats.find((row) => row.kind === kind);

	let busy = $state<EmailkindEnum>();
	/** A kind waiting for the team to say whether those it already applies to get it. */
	let confirming = $state<{ kind: EmailkindEnum; count: number }>();

	async function setEnabled(kind: EmailkindEnum, on: boolean, notifyExisting?: boolean) {
		busy = kind;
		try {
			await client.mutate.setConferenceEmailEnabled({
				__args: { conferenceId, kind, enabled: on, notifyExisting }
			});
			revision++;
		} catch (error) {
			toast.error(error instanceof Error ? error.message : m.genericToastError());
		} finally {
			busy = undefined;
		}
	}

	/** How many mails switching `kind` on would send right away; undefined when that failed. */
	async function openCount(kind: EmailkindEnum) {
		busy = kind;
		try {
			return Number(await client.query.openEmailCount({ __args: { conferenceId, kind } }));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : m.genericToastError());
		} finally {
			busy = undefined;
		}
	}

	/** Switching on asks first whether those it already applies to get it now. */
	async function toggle(kind: EmailkindEnum, on: boolean) {
		const count = on ? await openCount(kind) : 0;
		if (count === undefined) return;
		if (count > 0) confirming = { kind, count };
		else await setEnabled(kind, on, true);
	}

	async function confirm(notifyExisting: boolean) {
		const pending = confirming;
		confirming = undefined;
		if (pending) await setEnabled(pending.kind, true, notifyExisting);
	}

	let preview = $state<{ title: string; subject: string; html: string }>();

	async function showPreview(kind: EmailkindEnum) {
		try {
			const result = await client.query.emailPreview({
				__args: { conferenceId, kind },
				subject: true,
				html: true
			});
			preview = { title: emailKindTexts(kind).title, subject: result.subject, html: result.html };
		} catch (error) {
			toast.error(error instanceof Error ? error.message : m.genericToastError());
		}
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col gap-2">
		<p class="text-sm">{m.emailSettingsIntro()}</p>
		<p class="text-base-content/70 text-sm">
			<i class="fa-sharp-duotone fa-solid fa-clock mr-1"></i>
			{m.emailSettingsJobHint()}
		</p>
		{#if !canManage}
			<div class="alert alert-info alert-soft" role="status">
				<i class="fa-sharp-duotone fa-solid fa-lock"></i>
				<span>{m.emailSettingsReadOnly()}</span>
			</div>
		{/if}
	</div>

	{#each EMAIL_GROUPS as group (group.id)}
		<section class="flex flex-col gap-3">
			<h3 class="text-lg font-bold">{emailGroupTitle[group.id]()}</h3>
			{#each group.kinds as kind (kind)}
				<EmailKindCard
					{kind}
					enabled={enabled.has(kind)}
					{canManage}
					busy={busy === kind}
					counts={statsOf(kind)}
					ontoggle={(on) => toggle(kind, on)}
					onpreview={() => showPreview(kind)}
				/>
			{/each}
		</section>
	{/each}

	{#if canManage}
		<EmailLog {conferenceId} />
	{/if}
</div>

<Modal
	open={!!confirming}
	title={confirming ? m.emailSettingsEnableTitle({ count: confirming.count }) : ''}
	onclose={() => (confirming = undefined)}
>
	<p>{m.emailSettingsEnableText()}</p>
	{#snippet action()}
		<button class="btn" onclick={() => confirm(false)}>{m.emailSettingsEnableFuture()}</button>
		<button class="btn btn-primary" onclick={() => confirm(true)}>
			{m.emailSettingsEnableNotify({ count: confirming?.count ?? 0 })}
		</button>
	{/snippet}
</Modal>

<Modal
	open={!!preview}
	title={preview?.title ?? ''}
	fullWidth
	onclose={() => (preview = undefined)}
>
	{#if preview}
		<p class="text-base-content/60 text-sm">{m.emailSettingsPreviewHint()}</p>
		<p class="my-2 font-semibold">{preview.subject}</p>
		<iframe
			title={preview.subject}
			srcdoc={preview.html}
			sandbox=""
			class="border-base-300 h-[60vh] w-full rounded-box border bg-white"
		></iframe>
	{/if}
</Modal>
