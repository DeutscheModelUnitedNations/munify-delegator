<!--
	@component
	Opens the terms of the message service to read them again, under a participant's chat list.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import MessagingTermsModal from './MessagingTermsModal.svelte';

	let open = $state(false);
</script>

<button
	type="button"
	class="link link-hover text-base-content/70 flex items-center gap-2 px-4 pb-3 text-left text-sm"
	onclick={() => (open = true)}
	data-testid="chat-terms-read"
>
	<i aria-hidden="true" class="ph-duotone ph-scroll"></i>
	{m.chatTermsRead()}
</button>

<MessagingTermsModal bind:open />
