<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import Modal from '#lib/components/Modal.svelte';
	import { foodPreferenceOptions, genderOptions } from '#lib/components/form/userFieldOptions';
	import { calendarDayText } from '#lib/helpers/calendarDay';
	import { m } from '#lib/paraglide/messages';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import Fact from '../Fact.svelte';
	import PersonForm from '../PersonForm.svelte';
	import { addressFacts, type AddressPart } from '../personFacts';
	import { foodIcon, genderIcon } from '../stages';
	import AccessCardFact from './AccessCardFact.svelte';
	import AgeBadge from './AgeBadge.svelte';
	import AccountFacts from './AccountFacts.svelte';
	import SchoolFact from './SchoolFact.svelte';
	import SupervisorFact from './SupervisorFact.svelte';

	/**
	 * Everything the person entered about themselves, what the team looks up most first: how to
	 * reach them, what to keep in mind, their account. Edited in a dialog, where the reader may.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
		/** The reader sees everything, so what is empty is missing (`readsWholePerson`) */
		wholePerson: boolean;
		/** A delegate or single participant, who may have supervisors */
		student: boolean;
		/** The person has a `conferenceParticipant` row, which names their school */
		participant: boolean;
	}

	let { userId, conferenceId, wholePerson, student, participant }: Props = $props();

	// What the reader may not see comes back empty.
	const [user, me] = $derived(
		await Promise.all([
			client.liveQuery.user({
				__args: { id: userId },
				givenName: true,
				familyName: true,
				pronouns: true,
				email: true,
				phone: true,
				emergencyContacts: true,
				street: true,
				apartment: true,
				zip: true,
				city: true,
				region: true,
				country: true,
				birthday: true,
				gender: true,
				foodPreference: true
			}),
			getCurrentUser()
		])
	);

	// `updateUser` changes one's own profile, or anybody's for a system admin; the care team corrects
	// names and birthdays elsewhere (`updateUsersIdentityInfo`).
	const canEdit = $derived(me.sub === userId || me.myOIDCRoles.includes('admin'));
	let editing = $state(false);

	const gender = $derived(genderOptions().find(({ value }) => value === user.gender)?.label);
	const diet = $derived(
		foodPreferenceOptions().find(({ value }) => value === user.foodPreference)?.label
	);
	const address = $derived(
		addressFacts({ address: user, countryName: getFullTranslatedCountryNameFromISO3Code })
	);

	const partLabel: Record<AddressPart, () => string> = {
		street: () => m.street(),
		zip: () => m.zipCode(),
		city: () => m.city(),
		region: () => m.region(),
		country: () => m.country()
	};
	const missingParts = $derived(address.missing.map((part) => partLabel[part]()).join(', '));
</script>

<dl class="border-base-content/10 flex flex-col gap-2.5 border-t pt-3">
	<Fact
		label={m.phone()}
		icon="phone"
		value={user.phone}
		href={user.phone ? `tel:${user.phone}` : undefined}
		matters={wholePerson}
	/>
	<Fact label={m.email()} icon="envelope" value={user.email} href="mailto:{user.email}" />
	<Fact
		label={m.emergencyContacts()}
		icon="siren"
		value={user.emergencyContacts}
		matters={wholePerson}
	/>
	<Fact
		label={m.birthDate()}
		icon="cake"
		value={user.birthday && calendarDayText(user.birthday)}
		matters={wholePerson}
	>
		{#snippet extra()}
			<AgeBadge {userId} {conferenceId} />
		{/snippet}
	</Fact>
</dl>

<dl class="border-base-content/10 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t pt-3">
	<Fact label={m.gender()} icon={genderIcon(user.gender)} value={gender} />
	<Fact label={m.diet()} icon={foodIcon(user.foodPreference)} value={diet} matters={wholePerson} />
	{#if participant}
		<AccessCardFact {userId} {conferenceId} />
		<SchoolFact {userId} {conferenceId} />
	{/if}
	{#if student}
		<SupervisorFact {userId} {conferenceId} />
	{/if}
</dl>

<!-- Copied with the name, as a letter is addressed -->
<dl class="border-base-content/10 border-t pt-3">
	<Fact
		label={m.address()}
		icon="house"
		value={address.lines.join('\n')}
		copyText={[`${user.givenName} ${user.familyName}`, ...address.lines].join('\n')}
		matters={wholePerson}
		hint={wholePerson && address.lines.length > 0 && missingParts
			? m.userCardAddressMissing({ parts: missingParts })
			: undefined}
	/>
</dl>

<!-- The opt-ins are masked for some readers, and a masked flag fails its whole query -->
<svelte:boundary>
	<AccountFacts {userId} />
	{#snippet failed()}{/snippet}
</svelte:boundary>

{#if canEdit}
	<button class="btn btn-sm btn-ghost mt-auto w-full" onclick={() => (editing = true)}>
		<i aria-hidden="true" class="ph-duotone ph-note-pencil text-lg"></i>
		{m.edit()}
	</button>

	<Modal bind:open={editing} title={m.edit()} wider>
		<PersonForm {userId} {user} ondone={() => (editing = false)} />
	</Modal>
{/if}
