<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { client } from '#lib/api/rumbleClient/client';
	import { logger } from '#lib/logger';
	import FlowStep from '#lib/components/flowSteps/FlowStep.svelte';
	import { setFlowInteraction } from '#lib/components/flowSteps/flowInteraction';
	import Selection from '#lib/components/selection/index';
	import { sortByNames } from '#lib/helpers/formatNames';
	import { formatMoney } from '#lib/helpers/paymentFormat';
	import { fetchConferencePaymentData } from './conferencePaymentData';
	import { fetchPayablePeople } from './payablePeople';
	import { findOtherSupervisors } from './otherSupervisors';
	import { fetchMyOpenPayments } from './myPayments';
	import {
		completePaymentGuide,
		fetchPaymentProgress,
		savePaymentInfoRead
	} from './paymentProgress';
	import { paymentSteps, type PaymentStep } from './paymentSteps';
	import {
		createPaymentParticipantSelection,
		type PayableUser
	} from './participantSelection.svelte.js';
	import ParticipantSelection from './ParticipantSelection.svelte';
	import PaymentArrival from './PaymentArrival.svelte';
	import PaymentHints from './PaymentHints.svelte';
	import PaymentInfo from './PaymentInfo.svelte';
	import ReferenceCheck from './ReferenceCheck.svelte';
	import RestartPayment from './RestartPayment.svelte';
	import SelectableParticipant from './SelectableParticipant.svelte';
	import SelectableParticipantsFieldset from './SelectableParticipantsFieldset.svelte';
	import TransferDetails from './TransferDetails.svelte';

	/**
	 * The fee payment, step by step like the postal registration: what it is about, whom it covers,
	 * the reference, how to transfer (the payment guide), the transfer, and waiting for the money.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	// Set by the first click or key press, after which opened steps scroll to view. Before the first
	// `await`, after which no context can be set.
	let started = $state(false);
	setFlowInteraction({
		get started() {
			return started;
		}
	});

	// Where they left off, once: reopening a step does not undo what is kept.
	const keptProgress = fetchPaymentProgress(untrack(() => ({ userId, conferenceId })));

	const [people, conferencePaymentData, myPayments] = $derived(
		await Promise.all([
			fetchPayablePeople(conferenceId),
			fetchConferencePaymentData(conferenceId),
			fetchMyOpenPayments({ conferenceId, userId })
		])
	);
	const payment = $derived(myPayments.at(0));

	const kept = await keptProgress;
	let read = $state(kept.read);
	let hintsSeen = $state(kept.guideCompleted);
	let whoConfirmed = $state(false);

	// --- Whom a payment may cover
	const me = $derived<PayableUser>({
		id: people.user.sub,
		givenName: people.user.given_name ?? null,
		familyName: people.user.family_name ?? null
	});
	const supervisor = $derived(people.mySupervisorRegistrations.at(0));
	// A supervisor who does not come to the conference pays no fee of their own
	const canPayForSelf = $derived(!supervisor || supervisor.plansOwnAttendenceAtConference);
	const delegationMembers = $derived(people.myMemberships.at(0)?.delegation.members ?? []);
	const supervisedDelegationMembers = $derived(supervisor?.supervisedDelegationMembers ?? []);
	const supervisedSingleParticipants = $derived(supervisor?.supervisedSingleParticipants ?? []);
	const otherSupervisors = $derived(
		findOtherSupervisors({
			me: supervisor,
			candidates: people.supervisorsSharingAStudent
		}).toSorted(sortByNames)
	);
	const registrations = $derived([
		...delegationMembers,
		...supervisedDelegationMembers,
		...supervisedSingleParticipants
	]);
	// Shown in the picker, but no reference may cover them any more
	const paidUserIds = $derived(
		new Set(
			registrations
				.filter((registration) => registration.participant.paymentStatus === 'DONE')
				.map((registration) => registration.user.id)
		)
	);
	const fieldsets = $derived(
		[
			{ key: 'delegation', title: m.delegationMembers(), participants: delegationMembers },
			{
				key: 'supervisedDelegations',
				title: m.delegationMembers(),
				participants: supervisedDelegationMembers
			},
			{
				key: 'supervisedSingles',
				title: m.singleParticipants(),
				participants: supervisedSingleParticipants
			}
		].filter((fieldset) => fieldset.participants.length > 0)
	);
	const others = $derived(registrations.map((registration) => registration.user));
	const everyone = $derived(
		[...(canPayForSelf ? [me] : []), ...others, ...otherSupervisors].filter(
			(user, index, all) =>
				!paidUserIds.has(user.id) && all.findIndex((x) => x.id === user.id) === index
		)
	);
	const canPayForOthers = $derived(
		[...others, ...otherSupervisors].some((user) => user.id !== me.id)
	);
	let payForOthersChosen = $state(false);
	const payForOthers = $derived(payForOthersChosen || !canPayForSelf);
	const selection = createPaymentParticipantSelection(() =>
		payForOthers ? everyone : canPayForSelf ? [me] : []
	);

	function setPayForOthers(value: boolean) {
		payForOthersChosen = value;
		selection.selectAll();
	}

	// --- The steps
	const currency = $derived(conferencePaymentData.currency ?? 'EUR');
	const money = (amount: number) => formatMoney({ amount, currency, locale: getLocale() });
	const onDay = (date: Date) => new Date(date).toLocaleDateString(getLocale());

	const steps = $derived(
		paymentSteps({
			read,
			canPayForOthers,
			whoConfirmed,
			hasReference: !!payment,
			hintsSeen,
			transferReported: !!payment?.transferReportedAt
		})
	);

	function confirmRead() {
		read = true;
		if (kept.recorded) void savePaymentInfoRead(conferenceId);
	}

	function guideCompleted() {
		if (kept.recorded && !kept.guideCompleted) void completePaymentGuide();
	}

	async function reportTransfer(reported: boolean) {
		if (!payment) return;
		try {
			await client.mutate.reportPaymentTransfer({
				__args: { id: payment.id, reported },
				transferReportedAt: true
			});
		} catch (error) {
			logger.error('Reporting the transfer failed', error);
			toast.error(m.genericToastError());
		}
	}

	interface StepLook {
		title: string;
		summary: string;
		reopen?: () => void;
		editLabel?: string;
		editIcon?: string;
	}

	const lookAgain = { editLabel: m.postalRegistrationLookAgain(), editIcon: 'eye' };
	const coveredCount = $derived(payment ? payment.paymentFor.length : selection.selected.length);
	const looks: Record<PaymentStep, StepLook> = $derived({
		info: {
			title: m.paymentInfoTitle(),
			summary: m.postalRegistrationInfoRead(),
			reopen: () => (read = false),
			...lookAgain
		},
		who: {
			title: m.paymentWhoTitle(),
			summary: m.paymentWhoSummary({ count: coveredCount }),
			reopen: payment ? undefined : () => (whoConfirmed = false)
		},
		reference: {
			title: m.paymentReferenceTitle(),
			summary: payment
				? m.paymentReferenceSummary({ amount: money(payment.amount), reference: payment.id })
				: ''
		},
		hints: {
			title: m.paymentGuideTitle(),
			summary: m.postalRegistrationHintsSeen(),
			reopen: () => (hintsSeen = false),
			...lookAgain
		},
		transfer: {
			title: m.paymentTransferTitle(),
			summary: payment?.transferReportedAt
				? m.paymentTransferReported({ date: onDay(payment.transferReportedAt) })
				: '',
			reopen: () => void reportTransfer(false),
			editLabel: m.paymentTransferUndo(),
			editIcon: 'arrow-u-up-left'
		},
		arrival: { title: m.paymentArrivalTitle(), summary: '' }
	});

	/** Coming back, the open step may be far down the page. */
	function showOpenStep(list: HTMLElement) {
		if (untrack(() => steps.shown.length) > 1) {
			list.lastElementChild?.scrollIntoView({ block: 'nearest' });
		}
	}
</script>

<ol
	class="flex flex-col"
	{@attach showOpenStep}
	onclickcapture={() => (started = true)}
	onkeydowncapture={() => (started = true)}
>
	<!-- One by one rather than in an `each`, whose removed steps stay in the page -->
	{@render frame({ step: 'info', content: info })}
	{@render frame({ step: 'who', content: who })}
	{@render frame({ step: 'reference', content: reference })}
	{@render frame({ step: 'hints', content: hints })}
	{@render frame({ step: 'transfer', content: transfer })}
	{@render frame({ step: 'arrival', content: arrival })}
</ol>

{#snippet frame({ step, content }: { step: PaymentStep; content: Snippet })}
	{@const entry = steps.shown.find((shown) => shown.step === step)}
	{#if entry}
		<FlowStep
			number={entry.number}
			title={looks[step].title}
			summary={entry.done ? looks[step].summary : undefined}
			onEdit={looks[step].reopen}
			editLabel={looks[step].editLabel}
			editIcon={looks[step].editIcon}
			last={!entry.done}
			scrollIntoView
		>
			{@render content()}
		</FlowStep>
	{/if}
{/snippet}

{#snippet info()}
	<PaymentInfo
		feeAmount={conferencePaymentData.feeAmount}
		{currency}
		deadline={conferencePaymentData.paymentDeadline}
		onRead={confirmRead}
	/>
{/snippet}

{#snippet who()}
	<ParticipantSelection
		{selection}
		{payForOthers}
		{canPayForSelf}
		onPayForOthersChange={setPayForOthers}
		onConfirm={() => (whoConfirmed = true)}
	>
		{#if supervisor}
			<Selection.Fieldset title={m.supervisors()}>
				{#if canPayForSelf}
					<SelectableParticipant
						{selection}
						user={me}
						label={m.myself({ given_name: me.givenName ?? '', family_name: me.familyName ?? '' })}
					/>
				{/if}
				{#each otherSupervisors as supervisorUser (supervisorUser.id)}
					<SelectableParticipant {selection} user={supervisorUser} />
				{/each}
			</Selection.Fieldset>
		{/if}
		{#each fieldsets as fieldset (fieldset.key)}
			<SelectableParticipantsFieldset
				title={fieldset.title}
				{selection}
				{paidUserIds}
				participants={fieldset.participants}
			/>
		{/each}
	</ParticipantSelection>
{/snippet}

{#snippet reference()}
	{#if conferencePaymentData.feeAmount}
		<ReferenceCheck
			users={selection.selected}
			ownUserId={me.id}
			{conferenceId}
			feeAmount={conferencePaymentData.feeAmount}
			{currency}
		/>
	{:else}
		<div role="alert" class="alert alert-warning">
			<i aria-hidden="true" class="ph-duotone ph-warning text-2xl"></i>
			<span>{m.paymentFeeNotSet()}</span>
		</div>
	{/if}
{/snippet}

{#snippet hints()}
	<PaymentHints
		skippable={kept.guideSkippable}
		onComplete={guideCompleted}
		onDone={() => (hintsSeen = true)}
	/>
{/snippet}

{#snippet details()}
	{#if payment}
		<TransferDetails reference={payment.id} amount={payment.amount} {conferencePaymentData} />
	{/if}
{/snippet}

{#snippet restart()}
	{#if payment}
		<RestartPayment
			paymentId={payment.id}
			transferReported={!!payment.transferReportedAt}
			onDiscarded={() => (whoConfirmed = false)}
		/>
	{/if}
{/snippet}

{#snippet transfer()}
	{@render details()}
	<div class="border-base-300 mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
		{@render restart()}
		<button type="button" class="btn btn-primary" onclick={() => reportTransfer(true)}>
			<i aria-hidden="true" class="ph-bold ph-check"></i>
			{m.paymentReportTransfer()}
		</button>
	</div>
{/snippet}

{#snippet arrival()}
	{#if payment}
		<PaymentArrival
			reference={payment.id}
			createdAt={payment.createdAt}
			transferReportedAt={payment.transferReportedAt}
			{details}
			{restart}
		/>
	{/if}
{/snippet}
