<script lang="ts">
	import type { Snippet } from 'svelte';
	import { conferenceLanguageName } from '#lib/helpers/conferenceLanguage';
	import { getLocale, locales, type Locale } from '#lib/paraglide/runtime';
	import Modal from '#lib/components/Modal.svelte';

	/**
	 * Edits something the conference writes once per language - a mail's text, the footer - since a
	 * mail goes out in the recipient's. The form is remounted for each language, so it seeds once.
	 */
	interface Props {
		title: string;
		onclose: () => void;
		form: Snippet<[Locale]>;
	}

	let { title, onclose, form }: Props = $props();

	let open = $state(true);
	let locale = $state<Locale>(getLocale());
</script>

<Modal bind:open {title} fullWidth {onclose}>
	<div class="flex w-7xl max-w-full flex-col gap-4">
		<div role="tablist" class="tabs tabs-border">
			{#each locales as option (option)}
				<button
					role="tab"
					class="tab {locale === option ? 'tab-active' : ''}"
					onclick={() => (locale = option)}
				>
					{conferenceLanguageName({ language: option, inLocale: getLocale() })}
				</button>
			{/each}
		</div>
		{#key locale}
			{@render form(locale)}
		{/key}
	</div>
</Modal>
