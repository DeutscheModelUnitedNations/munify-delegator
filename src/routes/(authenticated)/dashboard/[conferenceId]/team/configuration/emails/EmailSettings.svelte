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

	let busy = $state<EmailkindEnum>();
	/** A kind waiting for the team to say whether those it already applies to get it. */
	let confirming = $state<{ kind: EmailkindEnum; count: number }>();

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

	function stage(kind: EmailkindEnum, enabled: boolean, notifyExisting: boolean, count = 0) {
		changes.stage({ kind, enabled, notifyExisting, openCount: count }, stored.has(kind));
	}

	/**
	 * Switching on asks first whether those it already applies to get it once saved. Switching back
	 * to what is stored needs no question.
	 */
	async function toggle(kind: EmailkindEnum, on: boolean) {
		if (!on || stored.has(kind)) return stage(kind, on, false);
		const count = await openCount(kind);
		if (count !== undefined) ask(kind, count);
	}

	/** Nobody to ask about: it simply goes to whoever qualifies from now on. */
	function ask(kind: EmailkindEnum, count: number) {
		if (count > 0) confirming = { kind, count };
		else stage(kind, true, true);
	}

	function confirm(notifyExisting: boolean) {
		const pending = confirming;
		confirming = undefined;
		if (pending) stage(pending.kind, true, notifyExisting, pending.count);
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
					busy={busy === kind}
					counts={statsOf(kind)}
					ontoggle={(on) => toggle(kind, on)}
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
