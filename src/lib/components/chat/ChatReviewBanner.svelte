<!--
	@component
	What participant care sees above a chat it reads because of a report: that it is reading along,
	unseen, and for how long. Who the people are and what can be done stands in the case file
	beside the chat.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
</script>

<p class="bg-warning/10 border-warning/30 flex items-start gap-2 border-b px-4 py-3 text-sm">
	<i aria-hidden="true" class="ph-duotone ph-eye text-warning mt-0.5 text-base"></i>
	<span>{m.chatReviewBanner()}</span>
</p>
