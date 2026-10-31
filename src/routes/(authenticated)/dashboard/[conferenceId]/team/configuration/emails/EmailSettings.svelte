<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import type { EmailkindEnum } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import Modal from '#lib/components/Modal.svelte';
	import { EMAIL_GROUPS } from '#lib/helpers/emailKinds';
	import { emailGroupTitle, emailKindTexts } from '#lib/helpers/emailKindTexts';
	import EmailKindCard from './EmailKindCard.svelte';
	import EmailLog from './EmailLog.svelte';
	import EmailEditorModal from './EmailEditorModal.svelte';
	import EmailFooterCard from './EmailFooterCard.svelte';
	import EmailFooterForm from './EmailFooterForm.svelte';
	import EmailTextForm from './EmailTextForm.svelte';
	import type { EmailChanges } from './emailChanges.svelte';

	interface Props {
		conferenceId: string;
		/** Where the switches wait for the page's save button. */
		changes: EmailChanges;
	}

	let { conferenceId, changes }: Props = $props();

	const settings = $derived(
		await client.liveQuery.conferenceEmailSettings({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			kind: true,
			enabled: true
		})
	);
	const stored = $derived(
		new Set(settings.filter((setting) => setting.enabled).map((setting) => setting.kind))
	);

	/** The kinds the conference wrote its own text for, in any language. */
	const texts = $derived(
		await client.liveQuery.conferenceEmailTexts({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			kind: true
		})
	);
	const customized = $derived(new Set(texts.map((text) => text.kind)));

	// The counts are worked out from the log, not live: asked again after each save.
	const revision = $derived(changes.revision);
	const stats = $derived(
		await client.query.emailStats({
			__args: { conferenceId, revision },
			kind: true,
			sent: true,
			failed: true,
			skipped: true
		})
	);
	const statsOf = (kind: EmailkindEnum) => stats.find((row) => row.kind === kind);

	// What is still owed is worked out from the state and the log: asked again whenever the newest
	// log row changes (a mail sent or skipped, here or by the job), after a save, and after an action.
	const newestLogs = $derived(
		await client.liveQuery.emailLogs({
			__args: {
				where: { conferenceId: { eq: conferenceId } },
				orderBy: { updatedAt: 'desc' },
				limit: 1
			},
			id: true,
			updatedAt: true
		})
	);
	const newestLog = $derived(newestLogs[0]);
	const newestLogId = $derived(newestLog?.id);
	const newestLogAt = $derived(newestLog?.updatedAt.toISOString());
	let actions = $state(0);
	const openRevision = $derived(`${revision}:${actions}:${newestLogId}:${newestLogAt}`);
	const openCounts = $derived(
		await client.query.openEmailCounts({
			__args: { conferenceId, revision: openRevision },
			kind: true,
			open: true
		})
	);
	const openOf = (kind: EmailkindEnum) => openCounts.find((row) => row.kind === kind)?.open ?? 0;

	/** A kind whose owed mails are being sent; the send runs on in the background. */
	let sending = $state<EmailkindEnum>();
	async function sendOpen(kind: EmailkindEnum) {
		sending = kind;
		try {
			const count = await client.mutate.sendOpenEmails({ __args: { conferenceId, kinds: [kind] } });
			toast.success(m.emailSendingStarted({ count: Number(count) }));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : m.genericToastError());
		} finally {
			sending = undefined;
			actions++;
		}
	}

	/** A kind whose owed mails the team is asked to confirm never sending. */
	let skipping = $state<{ kind: EmailkindEnum; count: number }>();
	async function skipOpen() {
		const pending = skipping;
		skipping = undefined;
		if (!pending) return;
		try {
			const count = await client.mutate.skipOpenEmails({
				__args: { conferenceId, kinds: [pending.kind] }
			});
			toast.success(m.emailSkippedToast({ count: Number(count) }));
		} catch (error) {
			toast.error(error instanceof Error ? error.message : m.genericToastError());
		} finally {
			actions++;
		}
	}

	/** A kind waiting for the team to say whether those it already applies to get it. */
	let confirming = $state<{ kind: EmailkindEnum; count: number }>();

	function stage({
		kind,
		enabled,
		notifyExisting,
		count = 0
	}: {
		kind: EmailkindEnum;
		enabled: boolean;
		notifyExisting: boolean;
		count?: number;
	}) {
		changes.stage({
			change: { kind, enabled, notifyExisting, openCount: count },
			stored: stored.has(kind)
		});
	}

	/**
	 * Switching on asks first whether those it already applies to get it once saved. Switching back
	 * to what is stored needs no question.
	 */
	function toggle({ kind, on }: { kind: EmailkindEnum; on: boolean }) {
		if (!on || stored.has(kind)) return stage({ kind, enabled: on, notifyExisting: false });
		ask({ kind, count: openOf(kind) });
	}

	/** Nobody to ask about: it simply goes to whoever qualifies from now on. */
	function ask({ kind, count }: { kind: EmailkindEnum; count: number }) {
		if (count > 0) confirming = { kind, count };
		else stage({ kind, enabled: true, notifyExisting: true });
	}

	function confirm(notifyExisting: boolean) {
		const pending = confirming;
		confirming = undefined;
		if (pending) stage({ kind: pending.kind, enabled: true, notifyExisting, count: pending.count });
	}

	/** The kind whose text is being edited. */
	let editing = $state<EmailkindEnum>();
	let editingFooter = $state(false);
</script>

<div class="flex flex-col gap-6">
	<EmailFooterCard {conferenceId} onedit={() => (editingFooter = true)} />

	{#each EMAIL_GROUPS as group (group.id)}
		<section class="flex flex-col gap-3">
			<h3 class="text-lg font-bold">{emailGroupTitle[group.id]()}</h3>
			{#each group.kinds as kind (kind)}
				<EmailKindCard
					{kind}
					enabled={changes.enabledOf(kind, stored.has(kind))}
					changed={changes.has(kind)}
					customized={customized.has(kind)}
					counts={statsOf(kind)}
					open={openOf(kind)}
					sending={sending === kind}
					ontoggle={(on) => toggle({ kind, on })}
					onsend={() => sendOpen(kind)}
					onskip={() => (skipping = { kind, count: openOf(kind) })}
					onedit={() => (editing = kind)}
				/>
			{/each}
		</section>
	{/each}

	<EmailLog {conferenceId} />
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
	open={!!skipping}
	title={skipping ? m.emailSkipOpenTitle({ count: skipping.count }) : ''}
	onclose={() => (skipping = undefined)}
>
	<p>{m.emailSkipOpenText()}</p>
	{#snippet action()}
		<button class="btn" onclick={() => (skipping = undefined)}>{m.cancel()}</button>
		<button class="btn btn-warning" onclick={skipOpen}>{m.emailSkipOpen()}</button>
	{/snippet}
</Modal>

{#if editing}
	{@const kind = editing}
	<EmailEditorModal title={emailKindTexts(kind).title} onclose={() => (editing = undefined)}>
		{#snippet form(locale)}
			<EmailTextForm {conferenceId} {kind} {locale} />
		{/snippet}
	</EmailEditorModal>
{/if}

{#if editingFooter}
	<EmailEditorModal title={m.emailFooterTitle()} onclose={() => (editingFooter = false)}>
		{#snippet form(locale)}
			<EmailFooterForm {conferenceId} {locale} />
		{/snippet}
	</EmailEditorModal>
{/if}
