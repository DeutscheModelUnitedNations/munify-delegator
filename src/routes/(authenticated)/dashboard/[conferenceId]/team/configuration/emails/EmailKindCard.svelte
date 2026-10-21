<script lang="ts">
	import type { EmailkindEnum } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';
	import { emailKindTexts } from './emailKindTexts';

	/** One automatic mail in the settings tab: its switch, what it does, and how often it went out. */
	interface Props {
		kind: EmailkindEnum;
		enabled: boolean;
		/** Participant care and project management; everybody else reads only. */
		canManage: boolean;
		busy: boolean;
		counts?: { sent: number; failed: number; skipped: number };
		ontoggle: (on: boolean) => void;
		onpreview: () => void;
	}

	let { kind, enabled, canManage, busy, counts, ontoggle, onpreview }: Props = $props();

	const texts = $derived(emailKindTexts(kind));
	const logged = $derived(counts ? counts.sent + counts.failed + counts.skipped : 0);
</script>

<div class="border-base-300 bg-base-100 rounded-box flex flex-col gap-3 border p-4">
	<div class="flex flex-wrap items-center gap-3">
		<input
			type="checkbox"
			class="toggle toggle-success"
			checked={enabled}
			disabled={!canManage || busy}
			aria-label={texts.title}
			onchange={(event) => ontoggle(event.currentTarget.checked)}
		/>
		<span class="flex-1 font-semibold">{texts.title}</span>
		{#if counts && logged > 0}
			<span class="text-base-content/60 text-xs">
				{m.emailSettingsStats({
					sent: counts.sent,
					failed: counts.failed,
					skipped: counts.skipped
				})}
			</span>
		{/if}
		{#if canManage}
			<button class="btn btn-ghost btn-sm" onclick={onpreview}>
				<i class="fa-sharp-duotone fa-solid fa-eye"></i>
				{m.emailSettingsPreview()}
			</button>
		{/if}
	</div>
	<dl class="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
		<dt class="text-base-content/60 font-medium">{m.emailSettingsTrigger()}</dt>
		<dd>{texts.trigger}</dd>
		<dt class="text-base-content/60 font-medium">{m.emailSettingsRecipients()}</dt>
		<dd>{texts.recipients}</dd>
		<dt class="text-base-content/60 font-medium">{m.emailSettingsContent()}</dt>
		<dd>{texts.content}</dd>
	</dl>
</div>
