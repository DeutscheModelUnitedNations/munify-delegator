<script lang="ts">
	import InitialsButton from './InitialsButton.svelte';

	interface Props {
		members: {
			id: string;
			user: { id: string; given_name: string; family_name: string };
		}[];
		delegationId: string;
		seatLabel: string;
		conferenceId: string;
	}

	let { members, delegationId, seatLabel, conferenceId }: Props = $props();
</script>

{#each members as member (member.id)}
	<InitialsButton
		given_name={member.user.given_name}
		family_name={member.user.family_name}
		userId={member.user.id}
		{conferenceId}
		switchSeat={{ memberId: member.id, delegationId, seatLabel }}
	/>
{/each}
