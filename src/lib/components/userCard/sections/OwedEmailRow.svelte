<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { owedEmailState, owedEmailTitle, wasSent, type OwedEmail } from './owedEmails';

	/** One mail the person is owed, with the button that sends it by hand. */
	interface Props {
		email: OwedEmail;
		/** This one is being sent. */
		sending: boolean;
		/** Another one is being sent. */
		disabled: boolean;
		onsend: () => void;
	}

	let { email, sending, disabled, onsend }: Props = $props();

	const sent = $derived(wasSent(email));
</script>

<div class="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
	<div class="flex min-w-0 flex-1 flex-col">
		<span class="font-semibold">{owedEmailTitle(email)}</span>
		<span class="text-base-content/60 text-xs">{owedEmailState(email)}</span>
	</div>
	<button class="btn btn-sm {sent ? 'btn-ghost' : 'btn-primary'}" {disabled} onclick={onsend}>
		{#if sending}
			<span class="loading loading-spinner loading-xs"></span>
		{:else}
			<i class="fa-sharp-duotone fa-solid fa-paper-plane"></i>
		{/if}
		{sent ? m.emailSendAgain() : m.emailSendNow()}
	</button>
</div>
