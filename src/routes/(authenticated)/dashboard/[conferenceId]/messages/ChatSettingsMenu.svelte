<!--
	@component
	The gear beside "new message": the mail about unread messages, and the terms to read again.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import MessagingTermsModal from '#lib/components/chat/MessagingTermsModal.svelte';
	import NotificationEmailsToggle from './NotificationEmailsToggle.svelte';

	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();

	let termsOpen = $state(false);
	let anchor = $state<HTMLButtonElement>();
	let popover = $state<HTMLDivElement>();
	let position = $state('top: 0px; left: 0px;');

	const popoverId = $props.id();
	const MENU_WIDTH = 288;

	// a popover lives in the top layer, so the messenger's clipped frame can't cut it off; it is
	// placed against the viewport, right-aligned under the gear
	function place(event: ToggleEvent) {
		if (event.newState !== 'open' || !anchor) return;
		const rect = anchor.getBoundingClientRect();
		const left = Math.max(8, rect.right - MENU_WIDTH);
		position = `top: ${rect.bottom + 4}px; left: ${left}px;`;
	}
</script>

<button
	bind:this={anchor}
	type="button"
	class="btn btn-ghost btn-sm btn-square"
	aria-label={m.chatSettings()}
	popovertarget={popoverId}
	data-testid="chat-settings"
>
	<i aria-hidden="true" class="ph-duotone ph-gear-six text-lg"></i>
</button>

<div
	bind:this={popover}
	id={popoverId}
	popover="auto"
	onbeforetoggle={place}
	class="settings-popover bg-base-100 text-base-content border-base-300 rounded-box m-0 w-72 border p-0 shadow-lg"
	style={position}
>
	<ul class="menu w-full p-2">
		<li>
			<NotificationEmailsToggle {userId} />
		</li>
		<li>
			<button
				type="button"
				onclick={() => {
					popover?.hidePopover();
					termsOpen = true;
				}}
				data-testid="chat-terms-read"
			>
				<i aria-hidden="true" class="ph-duotone ph-scroll"></i>
				{m.chatTermsRead()}
			</button>
		</li>
	</ul>
</div>

<MessagingTermsModal bind:open={termsOpen} />

<style>
	/* fades in under the gear and out again; `allow-discrete` keeps it shown while it fades out */
	.settings-popover {
		opacity: 0;
		translate: 0 -4px;
		transition:
			opacity 150ms ease-out,
			translate 150ms ease-out,
			display 150ms allow-discrete,
			overlay 150ms allow-discrete;
	}

	.settings-popover:popover-open {
		opacity: 1;
		translate: 0 0;
	}

	@starting-style {
		.settings-popover:popover-open {
			opacity: 0;
			translate: 0 -4px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.settings-popover {
			transition: none;
		}
	}
</style>
