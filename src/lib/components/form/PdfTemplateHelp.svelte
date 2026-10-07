<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Modal from '$lib/components/Modal.svelte';

	/** A small question mark that opens an explanation of how the PDF templates get filled in. */
	let open = $state(false);

	const entries = [
		{ title: m.pdfTemplateHelpContract(), body: m.pdfTemplateHelpContractBody() },
		{ title: m.pdfTemplateHelpGuardian(), body: m.pdfTemplateHelpGuardianBody() },
		{ title: m.pdfTemplateHelpMedia(), body: m.pdfTemplateHelpMediaBody() },
		{ title: m.pdfTemplateHelpTerms(), body: m.pdfTemplateHelpTermsBody() },
		{ title: m.pdfTemplateHelpCertificate(), body: m.pdfTemplateHelpCertificateBody() }
	];
</script>

<button
	type="button"
	class="btn btn-ghost btn-circle btn-xs"
	aria-label={m.pdfTemplateHelp()}
	title={m.pdfTemplateHelp()}
	onclick={() => (open = true)}
>
	<i class="fa-duotone fa-circle-question"></i>
</button>

<Modal bind:open title={m.pdfTemplateHelpTitle()}>
	<div class="flex flex-col gap-4 text-sm">
		<p>{m.pdfTemplateHelpIntro()}</p>
		<dl class="flex flex-col gap-3">
			{#each entries as entry (entry.title)}
				<div>
					<dt class="font-semibold">{entry.title}</dt>
					<dd class="text-base-content/70">{entry.body}</dd>
				</div>
			{/each}
		</dl>
		<p class="text-base-content/60">{m.pdfTemplateHelpTip()}</p>
	</div>
	{#snippet action()}
		<button type="button" class="btn" onclick={() => (open = false)}>{m.close()}</button>
	{/snippet}
</Modal>
