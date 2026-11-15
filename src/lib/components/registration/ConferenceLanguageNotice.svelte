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

<p
	role="note"
	class="text-base-content/70 flex items-start gap-2 text-sm {className}"
	data-testid="conference-language-notice"
>
	<i aria-hidden="true" class="ph-duotone ph-translate text-info mt-0.5 text-base"></i>
	<span>
		<strong class="text-base-content font-semibold"
			>{m.conferenceLanguageNoticeTitle({ language })}.</strong
		>
		{m.conferenceLanguageNoticeText({ language })}
	</span>
</p>
