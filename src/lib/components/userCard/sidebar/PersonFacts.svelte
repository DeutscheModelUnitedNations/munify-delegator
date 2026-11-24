<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { foodPreferenceOptions, genderOptions } from '#lib/components/form/userFieldOptions';
	import { calendarDayText } from '#lib/helpers/calendarDay';
	import { m } from '#lib/paraglide/messages';
	import Fact from '../Fact.svelte';
	import AccessCardFact from './AccessCardFact.svelte';
	import SchoolFact from './SchoolFact.svelte';
	import SupervisorFact from './SupervisorFact.svelte';

	/** What the team looks up most about a person: how to reach them and what to keep in mind. */
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
	const user = $derived(
		await client.liveQuery.user({
			__args: { id: userId },
			email: true,
			phone: true,
			emergencyContacts: true,
			birthday: true,
			gender: true,
			foodPreference: true
		})
	);

	const gender = $derived(genderOptions().find(({ value }) => value === user.gender)?.label);
	const diet = $derived(
		foodPreferenceOptions().find(({ value }) => value === user.foodPreference)?.label
	);
</script>

<dl class="flex flex-col gap-1.5">
	<Fact
		label={m.phone()}
		value={user.phone}
		href={user.phone ? `tel:${user.phone}` : undefined}
		matters={wholePerson}
	/>
	<Fact label={m.email()} value={user.email} href="mailto:{user.email}" />
	<Fact label={m.emergencyContacts()} value={user.emergencyContacts} matters={wholePerson} />
</dl>

<dl class="border-base-content/10 flex flex-col gap-1.5 border-t pt-3">
	<Fact
		label={m.birthDate()}
		value={user.birthday && calendarDayText(user.birthday)}
		matters={wholePerson}
	/>
	<Fact label={m.gender()} value={gender} />
	<Fact label={m.diet()} value={diet} matters={wholePerson} />
	{#if participant}
		<SchoolFact {userId} {conferenceId} />
		<AccessCardFact {userId} {conferenceId} />
	{/if}
	{#if student}
		<SupervisorFact {userId} {conferenceId} />
	{/if}
</dl>
