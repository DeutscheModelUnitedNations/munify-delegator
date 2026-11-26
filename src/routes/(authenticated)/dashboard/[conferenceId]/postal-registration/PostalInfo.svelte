<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** What the postal registration is about. */
	interface Props {
		/** Which documents there are and who signs them, as HTML (`postalRegistrationTexts`). */
		documents: string;
		onRead: () => void;
	}

	let { documents, onRead }: Props = $props();
</script>

<div class="prose max-w-none">
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
	{@html m.postalRegistrationIntroduction()}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
	{@html documents}
	<div class="not-prose alert alert-info">
		<i aria-hidden="true" class="ph-fill ph-info text-2xl"></i>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
		<span>{@html m.postalRegistrationTermsNotice()}</span>
	</div>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
	{@html m.postalRegistrationOutro()}
</div>
<button type="button" class="btn btn-primary mt-4 self-end" onclick={onRead}>
	{m.next()}
	<i aria-hidden="true" class="ph-duotone ph-arrow-down"></i>
</button>
