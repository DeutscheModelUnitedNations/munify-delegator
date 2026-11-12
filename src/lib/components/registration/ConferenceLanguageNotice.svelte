<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { client } from '#lib/api/rumbleClient/client';
	import {
		conferenceLanguageName,
		normalizeConferenceLanguage
	} from '#lib/helpers/conferenceLanguage';

	/**
	 * Tells whoever is about to apply which language the conference is held in, so nobody applies
	 * who cannot debate in it.
	 */
	interface Props {
		conferenceId: string;
		/** Spacing around the notice. */
		class?: string;
	}

	let { conferenceId, class: className = '' }: Props = $props();

	const conference = $derived(
		await client.liveQuery.conference({ __args: { id: conferenceId }, language: true })
	);
	const language = $derived(
		conferenceLanguageName({
			language: normalizeConferenceLanguage(conference.language),
			inLocale: getLocale()
		})
	);
</script>

<div
	role="note"
	class="alert alert-info alert-soft items-start {className}"
	data-testid="conference-language-notice"
>
	<i aria-hidden="true" class="ph-duotone ph-translate mt-0.5 text-xl"></i>
	<div class="flex flex-col gap-1">
		<h2 class="font-semibold">{m.conferenceLanguageNoticeTitle({ language })}</h2>
		<p class="text-sm">{m.conferenceLanguageNoticeText({ language })}</p>
	</div>
</div>
