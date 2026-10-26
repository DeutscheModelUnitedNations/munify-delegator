<script lang="ts">
	import type { EmailkindEnum } from '#lib/api/rumbleClient/client.js';
	import { conferenceLanguageName } from '#lib/helpers/conferenceLanguage.js';
	import { getLocale, locales, type Locale } from '#lib/paraglide/runtime.js';
	import Modal from '#lib/components/Modal.svelte';
	import { emailKindTexts } from './emailKindTexts';
	import EmailTextForm from './EmailTextForm.svelte';

	/**
	 * Writes the conference's own text for one kind of mail. Each language has its own, since a
	 * mail goes out in the recipient's; one left alone sends the default.
	 */
	interface Props {
		conferenceId: string;
		kind: EmailkindEnum;
		onclose: () => void;
	}

	let { conferenceId, kind, onclose }: Props = $props();

	let open = $state(true);
	let locale = $state<Locale>(getLocale());
</script>

<Modal bind:open title={emailKindTexts(kind).title} fullWidth {onclose}>
	<div class="flex w-7xl max-w-full flex-col gap-4">
		<div role="tablist" class="tabs tabs-border">
			{#each locales as option (option)}
				<button
					role="tab"
					class="tab {locale === option ? 'tab-active' : ''}"
					onclick={() => (locale = option)}
				>
					{conferenceLanguageName(option, getLocale())}
				</button>
			{/each}
		</div>
		{#key locale}
			<EmailTextForm {conferenceId} {kind} {locale} />
		{/key}
	</div>
</Modal>
