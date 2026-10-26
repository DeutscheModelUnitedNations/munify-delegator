<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client.js';
	import { m } from '#lib/paraglide/messages.js';

	/** The footer under every mail the conference sends: whether it has one, and the way to edit it. */
	interface Props {
		conferenceId: string;
		onedit: () => void;
	}

	let { conferenceId, onedit }: Props = $props();

	const footers = $derived(
		await client.liveQuery.conferenceEmailFooters({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			locale: true
		})
	);
	const written = $derived(footers.length > 0);
</script>

<div class="bg-base-100 rounded-box border-base-300 flex flex-col gap-2 border p-4">
	<div class="flex flex-wrap items-center gap-3">
		<i class="fa-sharp-duotone fa-solid fa-signature text-primary"></i>
		<span class="font-semibold">{m.emailFooterTitle()}</span>
		{#if written}
			<span class="badge badge-primary badge-soft badge-sm">{m.emailTextCustomized()}</span>
		{/if}
		<span class="flex-1"></span>
		<button class="btn btn-ghost btn-sm" onclick={onedit}>
			<i class="fa-sharp-duotone fa-solid fa-pen"></i>
			{m.emailTextEdit()}
		</button>
	</div>
	<p class="text-sm">{written ? m.emailFooterDescription() : m.emailFooterNone()}</p>
</div>
