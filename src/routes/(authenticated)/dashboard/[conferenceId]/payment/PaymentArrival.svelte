<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';

	/**
	 * Waiting for the money: how far the payment is, where to look up the transfer again, and what to
	 * do when nothing happens. The step ends when participant care marks the money received, which
	 * turns the page into the paid one.
	 */
	interface Props {
		reference: string;
		createdAt: Date;
		transferReportedAt: Date | null;
		/** The transfer's details, to look them up again. */
		details: Snippet;
		/** Starting over. */
		restart: Snippet;
	}

	let { reference, createdAt, transferReportedAt, details, restart }: Props = $props();

	const onDay = (date: Date) => new Date(date).toLocaleDateString(getLocale());
	const stages = $derived([
		{ label: m.paymentStageReference(), at: onDay(createdAt), done: true },
		{
			label: m.paymentStageTransferred(),
			at: transferReportedAt ? m.paymentStageReportedOn({ date: onDay(transferReportedAt) }) : '',
			done: !!transferReportedAt
		},
		{ label: m.paymentStageReceived(), at: m.paymentStageStillOpen(), done: false }
	]);
</script>

<div class="flex flex-col gap-4">
	<ol class="grid grid-cols-3 gap-2" aria-label={m.paymentStagesLabel()}>
		{#each stages as stage (stage.label)}
			<li class="flex flex-col gap-2" aria-current={stage.done ? undefined : 'step'}>
				<span class="h-2 rounded-full {stage.done ? 'bg-success' : 'bg-base-300'}"></span>
				<span class="font-bold">{stage.label}</span>
				<span class="text-base-content/70 text-sm">{stage.at}</span>
			</li>
		{/each}
	</ol>

	<div role="note" class="alert alert-info">
		<i aria-hidden="true" class="ph-duotone ph-hourglass-medium text-2xl"></i>
		<span>{m.paymentArrivalText({ reference })}</span>
	</div>

	<details class="bg-base-200 p-4">
		<summary class="cursor-pointer font-bold">{m.paymentShowTransferDetails()}</summary>
		<div class="mt-4">{@render details()}</div>
	</details>

	<div class="border-base-300 flex flex-col gap-2 border-t pt-4">
		<h3 class="font-bold">{m.paymentSomethingWrong()}</h3>
		<p class="text-base-content/80 text-sm">{m.paymentSomethingWrongText()}</p>
		<div class="flex flex-wrap gap-2">{@render restart()}</div>
	</div>
</div>
