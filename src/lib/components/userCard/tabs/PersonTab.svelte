<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { foodPreferenceOptions, genderOptions } from '#lib/components/form/userFieldOptions';
	import { calendarDayText } from '#lib/helpers/calendarDay';
	import { m } from '#lib/paraglide/messages';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import AccountSection from '../AccountSection.svelte';
	import Fact from '../Fact.svelte';
	import ParticipantSchoolSection from '../ParticipantSchoolSection.svelte';
	import PersonForm from '../PersonForm.svelte';
	import { addressFacts, type AddressPart } from '../personFacts';

	/** Everything the person entered about themselves, as text; a form only while it is edited. */
	interface Props {
		userId: string;
		conferenceId: string;
		/** The reader sees everything, so what is empty is missing (`readsWholePerson`) */
		wholePerson: boolean;
	}

	let { userId, conferenceId, wholePerson }: Props = $props();

	const [user, me] = $derived(
		await Promise.all([
			client.liveQuery.user({
				__args: { id: userId },
				givenName: true,
				familyName: true,
				pronouns: true,
				phone: true,
				email: true,
				street: true,
				apartment: true,
				zip: true,
				city: true,
				region: true,
				country: true,
				gender: true,
				birthday: true,
				foodPreference: true,
				emergencyContacts: true
			}),
			getCurrentUser()
		])
	);

	let editing = $state(false);

	// `updateUser` changes one's own profile, or anybody's for a system admin; the care team corrects
	// names and birthdays elsewhere (`updateUsersIdentityInfo`).
	const canEdit = $derived(me.sub === userId || me.myOIDCRoles.includes('admin'));

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

<div class="flex flex-col gap-6">
	{#if editing}
		<PersonForm {userId} {user} ondone={() => (editing = false)} />
	{:else}
		<div class="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
			<section class="bg-base-200 rounded-box flex flex-col gap-2 p-4">
				<h3 class="font-bold">{m.personalInformation()}</h3>
				<dl class="flex flex-col gap-1.5">
					<Fact label={m.firstName()} value={user.givenName} />
					<Fact label={m.lastName()} value={user.familyName} />
					<Fact label={m.pronouns()} value={user.pronouns} />
					<Fact label={m.gender()} value={gender} />
					<Fact
						label={m.birthDate()}
						value={user.birthday && calendarDayText(user.birthday)}
						matters={wholePerson}
					/>
					<Fact label={m.diet()} value={diet} matters={wholePerson} />
				</dl>
			</section>

			<section class="bg-base-200 rounded-box flex flex-col gap-2 p-4">
				<h3 class="font-bold">{m.contactInformation()}</h3>
				<dl class="flex flex-col gap-1.5">
					<Fact label={m.email()} value={user.email} href="mailto:{user.email}" />
					<Fact
						label={m.phoneNumber()}
						value={user.phone}
						href={user.phone ? `tel:${user.phone}` : undefined}
						matters={wholePerson}
					/>
					<Fact
						label={m.emergencyContacts()}
						value={user.emergencyContacts}
						matters={wholePerson}
					/>
					<Fact label={m.address()} value={address.lines.join('\n')} matters={wholePerson} />
				</dl>
				{#if wholePerson && address.lines.length > 0 && missingParts}
					<p class="text-warning text-sm">{m.userCardAddressMissing({ parts: missingParts })}</p>
				{/if}
			</section>
		</div>

		{#if canEdit}
			<button class="btn btn-sm btn-outline self-end" onclick={() => (editing = true)}>
				<i aria-hidden="true" class="ph-duotone ph-note-pencil"></i>
				{m.edit()}
			</button>
		{/if}
	{/if}

	<ParticipantSchoolSection {userId} {conferenceId} />

	<!-- The opt-ins are masked for some readers, and a masked flag fails its whole query -->
	<svelte:boundary>
		<AccountSection {userId} />
		{#snippet failed()}{/snippet}
	</svelte:boundary>
</div>
