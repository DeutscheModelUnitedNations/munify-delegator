<!--
	@component
	The message service's terms as a checklist, inside `MessagingTermsModal`. Every section shows its
	gist and opens to its full text. Asked to agree (`onAccepted`), the reader confirms each section
	with "Understood", which opens the next one; once all are, they tick the statements and agree.
	Only showing them, every section opens and closes freely.
-->
<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { hasErrorCode } from '#lib/api/errorCodes';
	import {
		allSectionsConfirmed,
		confirmSection,
		nextOpenSection
	} from '#lib/helpers/messagingTerms';
	import { m } from '#lib/paraglide/messages';
	import MessagingTermsSection from './MessagingTermsSection.svelte';

	interface Props {
		onAccepted?: () => void | Promise<void>;
		onclose: () => void;
	}

	let { onAccepted, onclose }: Props = $props();

	const baseId = $props.id();

	// The terms do not change while the dialog is open, so they are read once.
	const fetched = await client.query.messagingTerms({
		version: true,
		revision: true,
		contentHash: true,
		intro: true,
		sections: {
			key: true,
			icon: true,
			title: true,
			summary: true,
			paragraphs: true,
			callout: true
		},
		confirmations: { key: true, text: true }
	});
	const terms = {
		version: fetched.version,
		revision: fetched.revision,
		contentHash: fetched.contentHash,
		intro: fetched.intro,
		sections: fetched.sections.map((section) => ({
			key: section.key,
			icon: section.icon,
			title: section.title,
			summary: section.summary,
			paragraphs: [...section.paragraphs],
			callout: section.callout
		})),
		confirmations: fetched.confirmations.map((confirmation) => ({
			key: confirmation.key,
			text: confirmation.text
		}))
	};
	const keys = terms.sections.map((section) => section.key);

	// Whether the dialog asks for agreement or only shows the terms; it opens as one or the other.
	const asking = untrack(() => onAccepted !== undefined);
	let done = $state<string[]>([]);
	let open = $state<string | null>(asking ? nextOpenSection({ keys, done: [] }) : null);
	let ticked = $state<string[]>([]);
	let saving = $state(false);
	const headers: Record<string, HTMLButtonElement> = {};
	/** Where the statements are, which take the focus once the last section is confirmed. */
	let statements = $state<HTMLElement>();

	const allRead = $derived(allSectionsConfirmed({ keys, done }));
	const allTicked = $derived(
		terms.confirmations.every((confirmation) => ticked.includes(confirmation.key))
	);

	function toggle(key: string) {
		open = open === key ? null : key;
	}

	async function understood(key: string) {
		const next = confirmSection({ keys, done, key });
		done = next.done;
		open = next.open;
		await tick();
		// the confirmed section's panel closes with the focused button in it, so focus moves on
		if (next.open) headers[next.open]?.focus();
		else statements?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus();
	}

	function setTicked(key: string, checked: boolean) {
		ticked = checked ? [...ticked, key] : ticked.filter((other) => other !== key);
	}

	async function accept() {
		// the button is disabled until everything is read and ticked, and while this runs
		if (!onAccepted) return;
		saving = true;
		try {
			await client.mutate.acceptMessagingTerms({
				__args: {
					version: terms.version,
					revision: terms.revision,
					contentHash: terms.contentHash,
					confirmationIds: ticked
				}
			});
			onclose();
			await onAccepted();
		} catch (error) {
			toast.error(
				hasErrorCode({ err: error, code: 'INVALID_INPUT' })
					? m.chatTermsOutdated()
					: m.chatTermsAcceptFailed()
			);
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex flex-col gap-4" data-testid="chat-terms">
	<p class="text-base-content/80 text-sm leading-relaxed">{terms.intro}</p>

	{#if asking}
		<div class="flex flex-col gap-2">
			<div class="flex items-center justify-between gap-3 text-sm">
				<span>{m.chatTermsChecklistHint()}</span>
				<span class="text-primary shrink-0 font-semibold" data-testid="chat-terms-progress">
					{m.chatTermsProgress({ done: done.length, total: keys.length })}
				</span>
			</div>
			<progress
				class="progress progress-primary w-full"
				value={done.length}
				max={keys.length}
				aria-label={m.chatTermsProgress({ done: done.length, total: keys.length })}
			></progress>
		</div>
	{/if}

	<ol class="flex flex-col gap-3">
		{#each terms.sections as section, index (section.key)}
			<MessagingTermsSection
				{section}
				number={index + 1}
				{asking}
				done={done.includes(section.key)}
				open={open === section.key}
				panelId="{baseId}-{section.key}"
				bind:header={headers[section.key]}
				ontoggle={() => toggle(section.key)}
				onunderstood={() => understood(section.key)}
			/>
		{/each}
	</ol>

	{#if asking}
		<div class="bg-base-200 rounded-box flex flex-col gap-3 p-4" bind:this={statements}>
			<p class="flex items-center gap-2 text-sm" aria-live="polite" data-testid="chat-terms-status">
				<i
					aria-hidden="true"
					class="ph-duotone {allRead ? 'ph-check-circle text-success' : 'ph-lock-simple'} text-lg"
				></i>
				{allRead
					? m.chatTermsAllRead()
					: m.chatTermsOpenLeft({ count: keys.length - done.length, total: keys.length })}
			</p>
			{#each terms.confirmations as confirmation (confirmation.key)}
				<label class="flex items-start gap-3 text-sm {allRead ? 'cursor-pointer' : 'opacity-60'}">
					<input
						type="checkbox"
						class="checkbox checkbox-primary checkbox-sm mt-0.5"
						checked={ticked.includes(confirmation.key)}
						onchange={(event) => setTicked(confirmation.key, event.currentTarget.checked)}
						disabled={!allRead}
						data-testid="chat-terms-confirm"
					/>
					<span>{confirmation.text}</span>
				</label>
			{/each}
		</div>
	{/if}

	<div class="modal-action">
		{#if asking}
			<button type="button" class="btn btn-ghost" onclick={onclose}>{m.cancel()}</button>
			<button
				type="button"
				class="btn btn-primary"
				disabled={!allRead || !allTicked || saving}
				onclick={accept}
				data-testid="chat-terms-accept"
			>
				<i aria-hidden="true" class="ph-duotone ph-paper-plane-right"></i>
				{m.chatTermsAcceptAndSend()}
			</button>
		{:else}
			<button type="button" class="btn" onclick={onclose}>{m.close()}</button>
		{/if}
	</div>
</div>
