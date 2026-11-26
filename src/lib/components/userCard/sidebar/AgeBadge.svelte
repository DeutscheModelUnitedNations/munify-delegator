<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { ageAtStart } from '../personFacts';

	/** How old the person is at the conference, and whether they are under age there. */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const [user, conference] = $derived(
		await Promise.all([
			client.liveQuery.user({ __args: { id: userId }, birthday: true }),
			client.liveQuery.conference({ __args: { id: conferenceId }, startConference: true })
		])
	);
	const age = $derived(
		ageAtStart({ birthday: user.birthday, startConference: conference.startConference })
	);
</script>

{#if age}
	<span
		class={age.minor
			? 'badge badge-warning badge-sm ml-1 gap-1 align-middle'
			: 'text-base-content/60 ml-1 text-sm'}
		title={m.userCardAgeHint()}
	>
		{#if age.minor}
			<i aria-hidden="true" class="ph-duotone ph-shield-warning"></i>
		{/if}
		{age.minor ? m.userCardAgeMinor({ age: age.age }) : m.userCardAge({ age: age.age })}
	</span>
{/if}
