<script lang="ts">
	import { resolve } from '$app/paths';
	import UndrawCard from '$lib/components/UndrawCard.svelte';
	import { fetchMyParticipation } from '$lib/api/myConferenceParticipation';
	import { m } from '$lib/paraglide/messages';
	import singlePayment from '$assets/undraw/single_payment.svg';
	import delegationPayment from '$assets/undraw/delegation_payment.svg';
	import groupPayment from '$assets/undraw/group_payment.svg';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const participation = $derived(await fetchMyParticipation(params.conferenceId));

	let isDelegation = $derived(!!participation?.delegationMember);
	let isSupervisor = $derived(!!participation?.supervisor);
	let supervisorIsNotPresent = $derived(
		participation?.supervisor ? !participation.supervisor.plansOwnAttendenceAtConference : false
	);
</script>

<div class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.payment()}</h2>
	<p>{m.paymentDescription()}</p>

	<div class="flex w-full flex-col gap-4 md:flex-row md:flex-wrap">
		<UndrawCard
			title={m.singlePayment()}
			btnText={m.singlePaymentBtn()}
			btnLink={resolve(`/dashboard/${params.conferenceId}/payment/single`)}
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
				btnLink={resolve(`/dashboard/${params.conferenceId}/payment/delegation`)}
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
				btnLink={resolve(`/dashboard/${params.conferenceId}/payment/group`)}
				img={groupPayment}
				disabled={!isSupervisor}
				disabledText={m.paymentMethodNotAvailable()}
			>
				<p>{m.groupPaymentDescription()}</p>
			</UndrawCard>
		{/if}
	</div>
</div>
