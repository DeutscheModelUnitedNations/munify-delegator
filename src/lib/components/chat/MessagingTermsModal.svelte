<!--
	@component
	The terms of the message service. With `onAccepted` it asks for the reader's agreement, which a
	participant has to give before their first message, and calls it once that is stored; without,
	it only shows them. The terms come from the API (`messagingTerms`) when the dialog opens, and
	`MessagingTermsChecklist` walks through them.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import Modal from '#lib/components/Modal.svelte';
	import LoadError from '#lib/components/LoadError.svelte';
	import MessagingTermsChecklist from './MessagingTermsChecklist.svelte';

	interface Props {
		open: boolean;
		onAccepted?: () => void | Promise<void>;
	}

	let { open = $bindable(), onAccepted }: Props = $props();
</script>

<Modal bind:open wide title={m.chatTermsTitle()}>
	<svelte:boundary>
		<MessagingTermsChecklist {onAccepted} onclose={() => (open = false)} />
		{#snippet pending()}
			<div class="flex flex-col gap-3" aria-busy="true">
				<div class="skeleton h-12 w-full"></div>
				{#each { length: 5 } as _, index (index)}
					<div class="skeleton h-16 w-full"></div>
				{/each}
			</div>
		{/snippet}
		{#snippet failed(_error, reset)}
			<LoadError onretry={reset} />
		{/snippet}
	</svelte:boundary>
</Modal>
