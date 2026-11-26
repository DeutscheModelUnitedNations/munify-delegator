<!--
	@component
	Looking a payment reference up and settling it by hand: for transfers without a reference the
	bank payment sync recognised, and for anything else the desk confirms itself. The reference
	searched for is in the URL (`searchValue`), so other parts of the page link here.
-->
<script lang="ts">
	import { logger } from '#lib/logger';
	import { getLocale } from '#lib/paraglide/runtime';
	import {
		client,
		type AdministrativestatusEnum,
		type BanktransferresultEnum
	} from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import formatNames from '#lib/helpers/formatNames';
	import hotkeys from 'hotkeys-js';
	import { onDestroy, onMount, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { queryParameters } from 'sveltekit-search-params';
	import ScanHistory, { type ScanHistoryEntry } from '#lib/components/scanner/ScanHistory.svelte';
	import ScanSearchBar from '#lib/components/scanner/ScanSearchBar.svelte';
	import Kbd from '#lib/components/Kbd.svelte';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';
	import {
		canMarkReceived,
		statusIcon,
		transactionReadyFor,
		transactionStatusUpdate
	} from './paymentFlow';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const params = queryParameters({
		searchValue: {
			defaultValue: '',
			encode: (value) => value.trim(),
			decode: (value) => (value ?? '').trim()
		}
	});

	let hotkeyDebounce = $state(false);

	// Input ref for refocusing
	let searchInputElem = $state<HTMLInputElement>();

	// --- Data queries ---

	function fetchPaymentReference({
		reference,
		conferenceId
	}: {
		reference: string;
		conferenceId: string;
	}) {
		return Promise.all([
			client.query.paymentTransactions({
				__args: { where: { id: { eq: reference }, conference: { id: { eq: conferenceId } } } },
				id: true,
				amount: true,
				createdAt: true,
				recievedAt: true,
				transferReportedAt: true,
				discardedAt: true
			}),
			client.query.users({
				__args: {
					where: {
						paymentTransactionsReferences: { paymentTransaction: { id: { eq: reference } } }
					}
				},
				id: true,
				// only this conference's status, not every one the person ever had
				conferenceParticipants: {
					__args: { where: { conferenceId: { eq: conferenceId } } },
					id: true,
					paymentStatus: true
				},
				givenName: true,
				familyName: true
			}),
			client.query.conference({ __args: { id: conferenceId }, currency: true }),
			// what the bank payment sync matched to the reference
			client.query.bankTransfers({
				__args: {
					where: { paymentTransactionId: { eq: reference } },
					orderBy: { bookedAt: 'desc' }
				},
				externalId: true,
				amount: true,
				bookedAt: true,
				result: true
			})
		]);
	}

	/** The most recently confirmed transaction, shown so the desk can see its last action. */
	function fetchLastConfirmed(conferenceId: string) {
		return client.query.paymentTransactions({
			__args: {
				where: { conference: { id: { eq: conferenceId } }, recievedAt: { isNotNull: true } },
				orderBy: { updatedAt: 'desc' },
				limit: 1
			},
			id: true,
			recievedAt: true,
			createdAt: true,
			amount: true
		});
	}

	type ReferenceResult = Awaited<ReturnType<typeof fetchPaymentReference>>;

	let reference = $state<ReferenceResult>();
	let referenceFetching = $state(false);
	let lastConfirmed = $state<Awaited<ReturnType<typeof fetchLastConfirmed>>>();

	let paymentTransaction = $derived(reference?.[0][0]);
	let referencedUsers = $derived(reference?.[1]);
	let conference = $derived(reference?.[2]);
	let bankTransfers = $derived(reference?.[3] ?? []);

	async function loadReference(searchValue: string) {
		referenceFetching = true;
		try {
			reference = await fetchPaymentReference({
				reference: searchValue,
				conferenceId: conferenceId
			});
		} finally {
			referenceFetching = false;
		}
	}

	async function loadLastConfirmed() {
		lastConfirmed = await fetchLastConfirmed(conferenceId);
	}

	let recieveDate = $state<string>(new Date().toISOString().split('T')[0]);

	const getPaymentStatus = (userId: string) => {
		const user = referencedUsers?.find((user) => user.id === userId);
		return user?.conferenceParticipants[0]?.paymentStatus ?? 'PENDING';
	};

	// --- Effects ---

	// Fetch payment data when search value changes
	$effect(() => {
		if (params.searchValue) {
			void loadReference(params.searchValue);
		}
	});

	/** Whether the transaction searched for has loaded and nothing is pending. */
	const resultReady = $derived(
		transactionReadyFor({
			searchValue: params.searchValue,
			transactionId: paymentTransaction?.id,
			fetching: referenceFetching
		})
	);

	// Remember the transactions that were found, the latest first, each once
	const HISTORY_LENGTH = 5;
	let history = $state<ScanHistoryEntry[]>([]);

	/** The payers' names, comma separated. */
	const payerNames = (
		users: readonly { givenName?: string | null; familyName?: string | null }[]
	) =>
		users
			.map((user) =>
				formatNames({
					givenName: user.givenName ?? undefined,
					familyName: user.familyName ?? undefined
				})
			)
			.join(', ');

	const payers = $derived(payerNames(referencedUsers ?? []));
	const currency = $derived(conference?.currency ?? 'EUR');

	/** What a remembered transaction is called: its payers, else its amount. */
	const historyName = (amount: number) =>
		payers || amount.toLocaleString(getLocale(), { style: 'currency', currency });

	$effect(() => {
		const found = paymentTransaction;
		if (!found || !resultReady) return;
		const entry = { id: found.id, name: historyName(found.amount) };
		untrack(() => {
			history = [entry, ...history.filter((e) => e.id !== entry.id)].slice(0, HISTORY_LENGTH);
		});
	});

	// --- Actions ---

	const changeTransactionStatus = async (status: AdministrativestatusEnum) => {
		const update = transactionStatusUpdate({
			transactionId: paymentTransaction?.id,
			status,
			recieveDate
		});
		if ('error' in update) {
			logger.error('Updating the payment status failed', update.error);
			return;
		}

		const promise = client.mutate.updatePaymentTransaction({
			__args: update.args,
			id: true,
			recievedAt: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		await loadReference(params.searchValue);
	};

	const markReceivedAndNext = async () => {
		if (hotkeyDebounce) return;
		hotkeyDebounce = true;

		try {
			recieveDate = new Date().toISOString().split('T')[0];
			await changeTransactionStatus('DONE');
			await loadLastConfirmed();
			params.searchValue = '';
			setTimeout(() => {
				searchInputElem?.focus();
			}, 300);
		} finally {
			hotkeyDebounce = false;
		}
	};

	const resetView = () => {
		recieveDate = new Date().toISOString().split('T')[0];
		params.searchValue = '';
		setTimeout(() => {
			searchInputElem?.focus();
		}, 300);
	};

	// --- Display ---

	const formatLongDate = (date: Date | string) =>
		new Date(date).toLocaleDateString(getLocale(), {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});

	/** The latest confirmed transaction, if it really has been received. */
	const lastReceived = $derived.by(() => {
		const last = lastConfirmed?.[0];
		return last?.recievedAt ? { id: last.id, recievedAt: last.recievedAt } : undefined;
	});

	/** The icon telling where a referenced person's payment stands. */
	const paymentStatusIcon = ({
		userId,
		transactionReceived
	}: {
		userId: string;
		transactionReceived: boolean;
	}) => statusIcon({ status: getPaymentStatus(userId), transactionReceived });

	/** How each outcome of the bank payment sync is shown. */
	const BANK_TRANSFER_LOOKS: Record<
		BanktransferresultEnum,
		{ badge: string; icon: string; label: () => string }
	> = {
		RECEIVED: { badge: 'badge-success', icon: 'ph-check', label: m.bankTransferReceived },
		AMOUNT_MISMATCH: {
			badge: 'badge-warning',
			icon: 'ph-scales',
			label: m.bankTransferAmountMismatch
		},
		ALREADY_RECEIVED: {
			badge: 'badge-warning',
			icon: 'ph-copy',
			label: m.bankTransferAlreadyReceived
		}
	};

	// --- Hotkeys ---

	onMount(() => {
		void loadLastConfirmed();

		hotkeys('esc', () => {
			resetView();
		});

		hotkeys('alt+a', () => {
			if (
				canMarkReceived({
					searchValue: params.searchValue,
					transaction: paymentTransaction,
					busy: hotkeyDebounce
				})
			) {
				markReceivedAndNext();
			}
		});
	});

	onDestroy(() => {
		hotkeys.unbind('esc');
		hotkeys.unbind('alt+a');
	});
</script>

<section
	id="reference-lookup"
	aria-labelledby="reference-lookup-title"
	class="flex scroll-mt-24 flex-col gap-4"
>
	<header class="flex flex-col gap-1">
		<h2 id="reference-lookup-title" class="text-2xl font-bold">{m.paymentsLookupTitle()}</h2>
		<p class="text-base-content/70">{m.paymentsLookupDescription()}</p>
	</header>

	{#if lastReceived}
		<div class="alert alert-success" data-tour="team.payments.latest">
			<i aria-hidden="true" class="ph-duotone ph-money-wavy text-lg"></i>
			<div>
				{m.latestPayment({ id: lastReceived.id, date: formatLongDate(lastReceived.recievedAt) })}
			</div>
		</div>
	{/if}

	<ScanSearchBar
		bind:value={params.searchValue}
		bind:inputElem={searchInputElem}
		busy={referenceFetching}
		onsubmit={() => searchInputElem?.blur()}
		placeholder={m.referenceSearch()}
		aria-label={m.referenceSearch()}
		data-tour="team.payments.search"
	/>

	<div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
		<ScanHistory
			entries={history}
			activeId={params.searchValue}
			onSelect={(id) => (params.searchValue = id)}
		/>

		{#if paymentTransaction && resultReady}
			<section
				class="flex min-w-0 flex-col gap-4 rounded-box border border-base-300 bg-base-200/50 p-3 sm:p-5"
				aria-label={m.payment()}
			>
				<header class="flex items-center justify-between gap-2">
					<h3 class="flex items-center gap-2 text-lg font-bold">
						<i aria-hidden="true" class="ph-duotone ph-money-wavy text-xl"></i>
						{m.payment()}
					</h3>
					<button
						type="button"
						class="btn btn-square btn-ghost btn-sm"
						onclick={resetView}
						aria-label={m.close()}
					>
						<i aria-hidden="true" class="ph-duotone ph-x text-lg"></i>
					</button>
				</header>

				{@render transactionDetails(paymentTransaction)}

				<footer class="flex flex-wrap gap-2 border-t border-base-300 pt-4">
					{#if !paymentTransaction.recievedAt}
						<button
							class="btn flex-1 btn-error"
							onclick={() => changeTransactionStatus('PROBLEM')}
							disabled={hotkeyDebounce}
						>
							<i aria-hidden="true" class="ph-duotone ph-warning"></i>
							{m.markAsProblem()}
						</button>
						<button
							class="btn flex-1 btn-primary"
							onclick={markReceivedAndNext}
							disabled={hotkeyDebounce}
						>
							<i aria-hidden="true" class="ph-duotone ph-check"></i>
							{m.markAsReceived()}
							<Kbd hotkey="alt+a" />
						</button>
					{:else}
						<button class="btn flex-1 btn-error" onclick={resetView}>
							<i aria-hidden="true" class="ph-duotone ph-x"></i>
							{m.close()}
							<Kbd hotkey="Esc" />
						</button>
					{/if}
				</footer>
			</section>
		{:else if params.searchValue}
			<div
				class="flex min-h-64 flex-col items-center justify-center gap-3 rounded-box border-2 border-dashed border-base-300 p-6 text-center"
			>
				{#if referenceFetching}
					<span class="loading loading-md loading-spinner"></span>
					<span class="font-mono text-sm text-base-content/70">{params.searchValue}</span>
				{:else}
					<i aria-hidden="true" class="ph-duotone ph-warning text-3xl text-warning"></i>
					<p class="text-base-content/80">{m.noPaymentFound()}</p>
				{/if}
			</div>
		{/if}
	</div>
</section>

{#snippet referencedUser(user: NonNullable<typeof referencedUsers>[number], received: boolean)}
	{@const name = formatNames({
		givenName: user.givenName ?? undefined,
		familyName: user.familyName ?? undefined
	})}
	<button
		type="button"
		class="bg-base-200 hover:bg-base-300 flex w-full cursor-pointer items-center gap-2 rounded-field px-3 py-2 text-left sm:gap-4 sm:px-4"
		onclick={() => openUserCard(user.id)}
	>
		<i
			aria-hidden="true"
			class="ph-duotone {paymentStatusIcon({
				userId: user.id,
				transactionReceived: received
			})} text-2xl"
		></i>
		<span class="min-w-0 text-lg font-bold break-words">
			{name}
		</span>
		<span class="min-w-0 truncate text-sm opacity-60 max-sm:hidden">{user.id}</span>
		<i aria-hidden="true" class="ph-duotone ph-caret-right ml-auto opacity-60"></i>
	</button>
{/snippet}

{#snippet transactionDetails(transaction: NonNullable<typeof paymentTransaction>)}
	<!-- Payment reference ID -->
	<div class="mb-4">
		<p class="font-mono text-2xl font-bold break-all">{transaction.id}</p>
		<p class="opacity-60">
			{new Date(transaction.createdAt).toLocaleString(getLocale(), {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric',
				second: 'numeric'
			})}
		</p>
	</div>

	<!-- Received status alert -->
	{#if transaction.recievedAt}
		<div class="alert alert-success mb-4">
			<i aria-hidden="true" class="ph-duotone ph-check text-2xl"></i>
			{m.paymentReceived({ date: formatLongDate(transaction.recievedAt) })}
		</div>
	{/if}
	<!-- The payer's own word and choices, which change no status -->
	{#if transaction.discardedAt}
		<div class="alert alert-warning alert-soft mb-4">
			<i aria-hidden="true" class="ph-duotone ph-arrow-counter-clockwise text-2xl"></i>
			{m.paymentReferenceDiscardedOn({ date: formatLongDate(transaction.discardedAt) })}
		</div>
	{/if}
	{#if transaction.transferReportedAt && !transaction.recievedAt}
		<div class="alert alert-info alert-soft mb-4">
			<i aria-hidden="true" class="ph-duotone ph-paper-plane-tilt text-2xl"></i>
			{m.paymentTransferReportedOn({ date: formatLongDate(transaction.transferReportedAt) })}
		</div>
	{/if}

	<!-- Amount display -->
	<div class="bg-base-200 mb-4 w-fit max-w-sm rounded-field p-3">
		<div class="font-mono text-3xl font-bold">
			{transaction.amount.toLocaleString(getLocale(), {
				style: 'currency',
				currency: conference?.currency ?? 'EUR'
			})}
		</div>
	</div>

	{#if bankTransfers.length > 0}
		<div class="mb-4 flex flex-col gap-2" data-tour="team.payments.bankTransfers">
			<h4 class="text-lg font-bold">{m.bankTransfers()}</h4>
			<ul class="flex flex-col gap-2">
				{#each bankTransfers as transfer (transfer.id)}
					{@const look = BANK_TRANSFER_LOOKS[transfer.result]}
					<li class="flex flex-wrap items-center gap-2 rounded-field bg-base-200 px-3 py-2">
						<span class="badge badge-soft gap-1.5 {look.badge}">
							<i aria-hidden="true" class="ph-duotone {look.icon}"></i>
							{look.label()}
						</span>
						<span class="font-mono font-bold">
							{transfer.amount.toLocaleString(getLocale(), {
								style: 'currency',
								currency: conference?.currency ?? 'EUR'
							})}
						</span>
						<span class="text-sm opacity-70">
							{m.bankTransferBooked({
								date: formatLongDate(transfer.bookedAt),
								id: transfer.externalId
							})}
						</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Referenced users -->
	<div class="flex flex-col gap-2">
		<h4 class="text-lg font-bold">{m.referencedUsers()}</h4>
		<div class="flex flex-col gap-2">
			{#each referencedUsers ?? [] as user (user.id)}
				{@render referencedUser(user, !!transaction.recievedAt)}
			{/each}
		</div>
	</div>
{/snippet}
