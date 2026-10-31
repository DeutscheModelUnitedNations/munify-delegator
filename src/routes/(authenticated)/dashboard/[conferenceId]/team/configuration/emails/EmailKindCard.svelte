<script lang="ts">
	import type { EmailkindEnum } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { isAlwaysSent } from '#lib/helpers/emailKinds';
	import { emailKindTexts } from '#lib/helpers/emailKindTexts';

	/**
	 * One mail on the e-mail page: its switch for sending it automatically (none for the mails that
	 * always go out), what it does, how often it went out, and what is owed of it right now, to send
	 * or skip by hand.
	 */
	interface Props {
		kind: EmailkindEnum;
		enabled: boolean;
		/** Switched on the page and not saved yet. */
		changed: boolean;
		/** The conference wrote its own text, in some language. */
		customized: boolean;
		counts?: { sent: number; failed: number; skipped: number };
		/** Mails of it the conference owes right now and has not sent. */
		open: number;
		sending: boolean;
		ontoggle: (on: boolean) => void;
		onedit: () => void;
		onsend: () => void;
		onskip: () => void;
	}

	let {
		kind,
		enabled,
		changed,
		customized,
		counts,
		open,
		sending,
		ontoggle,
		onedit,
		onsend,
		onskip
	}: Props = $props();

	const texts = $derived(emailKindTexts(kind));
	const details = $derived([
		{ icon: 'fa-clock', label: m.emailSettingsTrigger(), text: texts.trigger },
		{ icon: 'fa-users', label: m.emailSettingsRecipients(), text: texts.recipients },
		{ icon: 'fa-envelope-open-text', label: m.emailSettingsContent(), text: texts.content }
	]);
	const logged = $derived(counts ? counts.sent + counts.failed + counts.skipped : 0);
</script>

<div
	class="bg-base-100 rounded-box flex flex-col gap-3 border p-4 {changed
		? 'border-warning'
		: 'border-base-300'}"
>
	<div class="flex flex-wrap items-center gap-3">
		<span class="font-semibold">{texts.title}</span>
		{#if isAlwaysSent(kind)}
			<span class="badge badge-neutral badge-soft badge-sm">{m.emailKindAlwaysSentBadge()}</span>
		{/if}
		{#if customized}
			<span class="badge badge-primary badge-soft badge-sm">{m.emailTextCustomized()}</span>
		{/if}
		<span class="flex-1"></span>
		{#if counts && logged > 0}
			<span class="text-base-content/60 text-xs">
				{m.emailSettingsStats({
					sent: counts.sent,
					failed: counts.failed,
					skipped: counts.skipped
				})}
			</span>
		{/if}
		<button class="btn btn-ghost btn-sm" onclick={onedit}>
			<i class="fa-sharp-duotone fa-solid fa-pen"></i>
			{m.emailTextEdit()}
		</button>
	</div>
	{#if !isAlwaysSent(kind)}
		<div class="flex flex-wrap items-center gap-3">
			<label class="flex cursor-pointer items-center gap-2 text-sm">
				<input
					type="checkbox"
					class="toggle toggle-success toggle-sm"
					checked={enabled}
					onchange={(event) => {
						// The switch shows what the tab holds: a question left unanswered leaves it as it was.
						const on = event.currentTarget.checked;
						event.currentTarget.checked = enabled;
						ontoggle(on);
					}}
				/>
				{m.emailSendAutomatically()}
			</label>
			<span class="flex-1"></span>
			{#if open > 0}
				<span class="badge badge-warning badge-soft badge-sm">
					{m.emailOpenCount({ count: open })}
				</span>
				<button class="btn btn-ghost btn-sm" disabled={sending} onclick={onskip}>
					<i class="fa-sharp-duotone fa-solid fa-forward"></i>
					{m.emailSkipOpen()}
				</button>
				<button class="btn btn-primary btn-sm" disabled={sending} onclick={onsend}>
					{#if sending}
						<span class="loading loading-spinner loading-xs"></span>
					{:else}
						<i class="fa-sharp-duotone fa-solid fa-paper-plane"></i>
					{/if}
					{m.emailSendOpenNow()}
				</button>
			{/if}
		</div>
	{/if}
	<div class="grid gap-x-6 gap-y-3 md:grid-cols-3">
		{#each details as detail (detail.label)}
			<div class="flex flex-col gap-1">
				<span class="text-base-content/60 flex items-center gap-2 text-xs font-semibold uppercase">
					<i class="fa-sharp-duotone fa-solid {detail.icon} text-primary"></i>
					{detail.label}
				</span>
				<p class="text-sm">{detail.text}</p>
			</div>
		{/each}
	</div>
</div>
