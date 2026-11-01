<script lang="ts">
	import InitialsButton from './InitialsButton.svelte';

	interface Props {
		members: { id: string; user: { id: string; givenName: string; familyName: string } }[];
		delegationId: string;
		seatLabel: string;
	}

	let { members, delegationId, seatLabel }: Props = $props();
</script>

{#each members as member (member.id)}
	<InitialsButton
		given_name={member.user.givenName}
		family_name={member.user.familyName}
		userId={member.user.id}
		switchSeat={{ memberId: member.id, delegationId, seatLabel }}
	/>
{/each}
