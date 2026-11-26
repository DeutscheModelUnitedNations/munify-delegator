<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { client } from '#lib/api/rumbleClient/client';
	import FlowStep from '#lib/components/flowSteps/FlowStep.svelte';
	import { setFlowInteraction } from '#lib/components/flowSteps/flowInteraction';
	import { postalRegistrationTexts } from '#lib/helpers/postalRegistrationTexts';
	import AddressBox from './AddressBox.svelte';
	import AgeQuestion from './AgeQuestion.svelte';
	import DetailsCheck from './DetailsCheck.svelte';
	import DownloadBox from './DownloadBox.svelte';
	import PostalInfo from './PostalInfo.svelte';
	import SendingHints from './SendingHints.svelte';
	import { detailsFingerprint, detailsSummary } from './postalDetails';
	import {
		fetchPostalProgress,
		savePostalProgress,
		type PostalProgressUpdate
	} from './postalProgress';
	import { postalSteps, type PostalStep } from './postalSteps';

	/**
	 * The postal registration, step by step as the application is: what it is about, checking one's
	 * details and age, how to send the documents, and then the download and the address.
	 */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	// Set by the first click or key press, after which opened steps scroll to view. Before
	// the first `await`, after which no context can be set.
	let started = $state(false);
	setFlowInteraction({
		get started() {
			return started;
		}
	});

	// Where they left off, once: reopening a step does not undo what is kept.
	const keptProgress = fetchPostalProgress(untrack(() => ({ userId, conferenceId })));

	const [conference, user] = $derived(
		await Promise.all([
			client.liveQuery.conference({ __args: { id: conferenceId }, startConference: true }),
			client.liveQuery.user({
				__args: { id: userId },
				givenName: true,
				familyName: true,
				street: true,
				apartment: true,
				zip: true,
				city: true,
				country: true,
				birthday: true
			})
		])
	);

	const onDate = (date: Date | null | undefined) =>
		date ? new Date(date).toLocaleDateString(getLocale()) : '';

	const texts = $derived(
		postalRegistrationTexts({
			birthday: user.birthday,
			startConference: conference.startConference,
			conferenceStart: onDate(conference.startConference)
		})
	);
	const details = $derived(detailsFingerprint(user));

	const kept = await keptProgress;
	let read = $state(kept.read);
	let confirmedDetails = $state(kept.confirmedDetails);
	let confirmedOfAge = $state(kept.confirmedOfAge);
	let hintsSeen = $state(kept.hintsSeen);

	function keep(progress: PostalProgressUpdate) {
		if (kept.recorded) void savePostalProgress({ conferenceId, progress });
	}

	function confirmRead() {
		read = true;
		keep({ infoRead: true });
	}

	function confirmDetails() {
		confirmedDetails = details;
		keep({ confirmedDetails: details });
	}

	function confirmAge() {
		confirmedOfAge = texts.age?.ofAge;
		keep({ confirmedOfAge: texts.age?.ofAge });
	}

	const steps = $derived(
		postalSteps({
			read,
			details,
			confirmedDetails,
			ofAge: texts.age?.ofAge,
			confirmedOfAge,
			hintsSeen
		})
	);

	interface StepLook {
		title: string;
		summary: string;
		reopen?: () => void;
		editLabel?: string;
		editIcon?: string;
	}

	/** Coming back, the open step may be far down the page. */
	function showOpenStep(list: HTMLElement) {
		if (untrack(() => steps.shown.length) > 1) {
			list.lastElementChild?.scrollIntoView({ block: 'nearest' });
		}
	}

	/** Every step's heading, what it says once it is done, and how it is opened again. */
	const lookAgain = { editLabel: m.postalRegistrationLookAgain(), editIcon: 'eye' };
	const looks: Record<PostalStep, StepLook> = $derived({
		info: {
			title: m.postalRegistrationInfoTitle(),
			summary: m.postalRegistrationInfoRead(),
			reopen: () => (read = false),
			...lookAgain
		},
		details: {
			title: m.postalRegistrationDetailsTitle(),
			summary: detailsSummary(user),
			reopen: () => (confirmedDetails = undefined)
		},
		age: {
			title: m.postalRegistrationAgeTitle(),
			summary: texts.age?.summary ?? '',
			reopen: () => (confirmedOfAge = undefined)
		},
		hints: {
			title: m.postalRegistrationHintsTitle(),
			summary: m.postalRegistrationHintsSeen(),
			reopen: () => (hintsSeen = false),
			...lookAgain
		},
		send: { title: m.postalRegistrationSendTitle(), summary: '' }
	});
</script>

<ol
	class="flex flex-col"
	{@attach showOpenStep}
	onclickcapture={() => (started = true)}
	onkeydowncapture={() => (started = true)}
>
	<!-- One by one rather than in an `each`, whose removed steps stay in the page -->
	{@render frame({ step: 'info', content: info })}
	{@render frame({ step: 'details', content: check })}
	{@render frame({ step: 'age', content: age })}
	{@render frame({ step: 'hints', content: hints })}
	{@render frame({ step: 'send', content: send })}
</ol>

{#snippet frame({ step, content }: { step: PostalStep; content: Snippet })}
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
	<PostalInfo documents={texts.documents} onRead={confirmRead} />
{/snippet}

{#snippet check()}
	<DetailsCheck details={user} complete={details !== undefined} onConfirm={confirmDetails} />
{/snippet}

{#snippet age()}
	{#if texts.age}
		<AgeQuestion age={texts.age} birthday={onDate(user.birthday)} onConfirm={confirmAge} />
	{/if}
{/snippet}

{#snippet hints()}
	<SendingHints onDone={() => (hintsSeen = true)} />
{/snippet}

{#snippet send()}
	<div class="grid items-start gap-8 lg:grid-cols-2">
		<DownloadBox {userId} {conferenceId} details={user} warning={texts.warning} />
		<AddressBox {conferenceId} whereTo={texts.whereTo} />
	</div>
{/snippet}
