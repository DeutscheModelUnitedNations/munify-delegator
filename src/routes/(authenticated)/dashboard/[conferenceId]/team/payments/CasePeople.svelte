<!--
	@component
	The people a review case's payments cover, with their payment status; ticked as paid where the
	case asks who paid (`selectable`).
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import formatNames from '#lib/helpers/formatNames';
	import { translateAdministrativeStatus } from '#lib/utils/enumTranslations';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';
	import type { ReviewPayment } from './reviewCases';

	interface Props {
		people: ReviewPayment['paymentFor'];
		/** The participant row ids ticked as paid */
		paid: string[];
		selectable: boolean;
		disabled: boolean;
	}

	let { people, paid = $bindable(), selectable, disabled }: Props = $props();

	const id = $props.id();

	const name = (user: ReviewPayment['paymentFor'][number]['user']) =>
		formatNames({
			givenName: user.givenName ?? undefined,
			familyName: user.familyName ?? undefined
		});
</script>

<fieldset class="flex min-w-0 flex-col gap-2">
	<legend class="mb-2 font-bold">{m.paymentCasePeople()}</legend>
	{#if selectable}
		<p class="mb-1 text-sm text-base-content/60">{m.paymentCasePeopleHint()}</p>
	{/if}
	<ul class="flex flex-col gap-1">
		{#each people as person (person.conferenceParticipantId)}
			<li class="flex items-center gap-3 rounded-field bg-base-200 px-3 py-2">
				{#if selectable}
					<input
						id="{id}-{person.conferenceParticipantId}"
						type="checkbox"
						class="checkbox checkbox-sm"
						value={person.conferenceParticipantId}
						bind:group={paid}
						{disabled}
					/>
					<label for="{id}-{person.conferenceParticipantId}" class="min-w-0 flex-1 font-bold">
						{name(person.user)}
					</label>
				{:else}
					<span class="min-w-0 flex-1 font-bold">{name(person.user)}</span>
				{/if}
				<span class="text-xs text-base-content/60">
					{translateAdministrativeStatus(person.participant.paymentStatus)}
				</span>
				<button
					type="button"
					class="btn btn-square btn-ghost btn-xs"
					aria-label={m.chatOpenUserCard({ name: name(person.user) })}
					onclick={() => openUserCard(person.user.id)}
				>
					<i aria-hidden="true" class="ph-duotone ph-identification-card"></i>
				</button>
			</li>
		{/each}
	</ul>
</fieldset>
