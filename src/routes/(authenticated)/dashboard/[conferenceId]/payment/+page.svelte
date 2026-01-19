<script lang="ts">
	import UndrawCard from '$lib/components/UndrawCard.svelte';
	import { m } from '$lib/paraglide/messages';
	import singlePayment from '$assets/undraw/single_payment.svg';
	import delegationPayment from '$assets/undraw/delegation_payment.svg';
	import groupPayment from '$assets/undraw/group_payment.svg';
	import { type PageData } from './$houdini';

	let { data }: { data: PageData } = $props();

	let isDelegation = $derived(!!data.conferenceQueryData?.findUniqueDelegationMember);
	let isSupervisor = $derived(!!data.conferenceQueryData?.findUniqueConferenceSupervisor);
	let supervisorIsNotPresent = $derived(
		data.conferenceQueryData?.findUniqueConferenceSupervisor
			? !data.conferenceQueryData.findUniqueConferenceSupervisor.plansOwnAttendenceAtConference
			: false
	);
</script>

<div class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.payment()}</h2>
	<p>{m.paymentDescription()}</p>

	<div class="flex w-full flex-col gap-4 md:flex-row md:flex-wrap">
		<UndrawCard
			title={m.singlePayment()}
			btnText={m.singlePaymentBtn()}
			btnLink="./payment/single"
			img={singlePayment}
			disabled={supervisorIsNotPresent}
			disabledText={m.paymentMethodNotAvailable()}
		>
			<p>{m.singlePaymentDescription()}</p>
		</UndrawCard>
		{#if isDelegation}
			<UndrawCard
				title={m.delegationPayment()}
				btnText={m.delegationPaymentBtn()}
				btnLink="./payment/delegation"
				img={delegationPayment}
				disabled={!isDelegation}
				disabledText={m.paymentMethodNotAvailable()}
			>
				<p>{m.delegationPaymentDescription()}</p>
			</UndrawCard>
		{/if}
		{#if isSupervisor}
			<UndrawCard
				title={m.groupPayment()}
				btnText={m.groupPaymentBtn()}
				btnLink="./payment/group"
				img={groupPayment}
				disabled={!isSupervisor}
				disabledText={m.paymentMethodNotAvailable()}
			>
				<p>{m.groupPaymentDescription()}</p>
			</UndrawCard>
		{/if}
	</div>
</div>
