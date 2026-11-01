<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { MAX_EMAILS_PER_SECOND, parseEmailsPerSecond } from '#lib/schemata/emailsPerSecond';
	import type { EmailChanges } from './emailChanges.svelte';

	/** How many mails per second the sweeps send at most; held until the page's save button. */
	interface Props {
		conferenceId: string;
		changes: EmailChanges;
	}

	let { conferenceId, changes }: Props = $props();

	const conference = $derived(
		await client.liveQuery.conference({ __args: { id: conferenceId }, emailsPerSecond: true })
	);
	const stored = $derived(conference.emailsPerSecond ?? null);

	/** What the team typed; follows the stored value until they type something of their own. */
	let typed = $state<string>();
	// Reads the stored value even while the team types: a live result nobody reads loses its
	// subscriber, and the update a save publishes would never reach the field.
	const storedText = $derived(String(changes.paceOf(stored) ?? ''));
	const shown = $derived.by(() => {
		const fallback = storedText;
		return typed ?? fallback;
	});
	const invalid = $derived(typed !== undefined && parseEmailsPerSecond(typed) === undefined);

	function oninput(event: Event & { currentTarget: HTMLInputElement }) {
		typed = event.currentTarget.value;
		const after = parseEmailsPerSecond(typed);
		// an invalid entry stages nothing, so saving cannot write it
		changes.stagePace({ before: stored, after: after === undefined ? stored : after });
	}

	// a save (or another team member's) starts the field over from the stored value
	$effect(() => {
		if (!changes.pace && !invalid) typed = undefined;
	});
</script>

<div
	class="bg-base-100 rounded-box flex flex-col gap-2 border p-4 {changes.pace
		? 'border-warning'
		: 'border-base-300'}"
>
	<div class="flex items-center gap-3">
		<i class="fa-sharp-duotone fa-solid fa-gauge text-primary"></i>
		<span class="font-semibold">{m.emailsPerSecondTitle()}</span>
	</div>
	<p class="text-sm">{m.emailsPerSecondDescription()}</p>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.emailsPerSecondLabel()}</legend>
		<input
			type="number"
			class="input w-full max-w-xs"
			class:input-error={invalid}
			min="1"
			max={MAX_EMAILS_PER_SECOND}
			step="1"
			placeholder={m.emailsPerSecondUnlimited()}
			aria-label={m.emailsPerSecondLabel()}
			value={shown}
			aria-invalid={invalid}
			{oninput}
		/>
		{#if invalid}
			<p class="text-error text-sm" role="alert">
				{m.emailsPerSecondRange({ max: MAX_EMAILS_PER_SECOND })}
			</p>
		{/if}
	</fieldset>
</div>
