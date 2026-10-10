<script lang="ts">
	import { client, type AdministrativestatusEnum } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/helpers/formatNames';
	import hotkeys from 'hotkeys-js';
	import { onDestroy, onMount, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { queryParameters } from 'sveltekit-search-params';
	import ScanHistory, { type ScanHistoryEntry } from '$lib/components/scanner/ScanHistory.svelte';
	import ScanSearchBar from '$lib/components/scanner/ScanSearchBar.svelte';
	import Kbd from '$lib/components/Kbd.svelte';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import type { PageProps } from './$types';
	import { canMarkReceived, transactionReadyFor, transactionStatusUpdate } from './paymentFlow';

	let { params: routeParams }: PageProps = $props();

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

	function fetchPaymentReference(reference: string, conferenceId: string) {
		return Promise.all([
			client.query.paymentTransactions({
				__args: { where: { id: { eq: reference }, conferenceId: { eq: conferenceId } } },
				id: true,
				amount: true,
				createdAt: true,
				recievedAt: true
			}),
			client.query.users({
				__args: {
					where: {
						paymentTransactionsReferences: { paymentTransaction: { id: { eq: reference } } }
					}
				},
				id: true,
				// only this conference's status, not every one the person ever had
				conferenceParticipantStatus: {
					__args: { where: { conferenceId: { eq: conferenceId } } },
					id: true,
					paymentStatus: true
				},
				givenName: true,
				familyName: true
			}),
			client.query.conference({ __args: { id: conferenceId }, currency: true })
		]);
	}

	/** The most recently confirmed transaction, shown so the desk can see its last action. */
	function fetchLastConfirmed(conferenceId: string) {
		return client.query.paymentTransactions({
			__args: {
				where: { conferenceId: { eq: conferenceId }, recievedAt: { isNotNull: true } },
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

	async function loadReference(searchValue: string) {
		referenceFetching = true;
		try {
			reference = await fetchPaymentReference(searchValue, routeParams.conferenceId);
		} finally {
			referenceFetching = false;
		}
	}

	async function loadLastConfirmed() {
		lastConfirmed = await fetchLastConfirmed(routeParams.conferenceId);
	}

	let recieveDate = $state<string>(new Date().toISOString().split('T')[0]);

	const getPaymentStatus = (userId: string) => {
		const user = referencedUsers?.find((user) => user.id === userId);
		return user?.conferenceParticipantStatus[0]?.paymentStatus ?? 'PENDING';
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
		transactionReadyFor(params.searchValue, paymentTransaction?.id, referenceFetching)
	);

	// Remember the transactions that were found, the latest first, each once
	const HISTORY_LENGTH = 5;
	let history = $state<ScanHistoryEntry[]>([]);

	/** The payers' names, comma separated. */
	const payerNames = (
		users: readonly { givenName?: string | null; familyName?: string | null }[]
	) =>
		users
			.map((user) => formatNames(user.givenName ?? undefined, user.familyName ?? undefined))
			.join(', ');

	const payers = $derived(payerNames(referencedUsers ?? []));
	const currency = $derived(conference?.currency ?? 'EUR');

	/** What a remembered transaction is called: its payers, else its amount. */
	const historyName = (amount: number) =>
		payers || amount.toLocaleString(undefined, { style: 'currency', currency });

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
		const update = transactionStatusUpdate(paymentTransaction?.id, status, recieveDate);
		if ('error' in update) {
			console.error(update.error);
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
		new Date(date).toLocaleDateString(undefined, {
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
	function paymentStatusIcon(userId: string, transactionReceived: boolean) {
		const status = getPaymentStatus(userId);
		if (status === 'DONE') {
			return transactionReceived ? 'fa-check' : 'fa-circle-exclamation-check fa-beat-fade';
		}
		if (status === 'PROBLEM') return 'fa-triangle-exclamation fa-beat-fade';
		return 'fa-hourglass-half';
	}

	// --- Hotkeys ---

	onMount(() => {
		void loadLastConfirmed();

		hotkeys('esc', () => {
			resetView();
		});

		hotkeys('alt+a', () => {
			if (canMarkReceived(params.searchValue, paymentTransaction, hotkeyDebounce)) {
				markReceivedAndNext();
			}
		});
	});

	onDestroy(() => {
		hotkeys.unbind('esc');
		hotkeys.unbind('alt+a');
	});
</script>

<div class="flex w-full flex-col gap-6 md:p-10">
	<div class="flex flex-col gap-2">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
		<p class="leading-relaxed text-base-content/70">{@html m.paymentAdminDescription()}</p>
	</div>

	{#if lastReceived}
		<div class="alert alert-success">
			<i class="fa-sharp-duotone fa-solid fa-money-bill-transfer text-lg"></i>
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
	/>

	<div class="grid items-start gap-6 lg:grid-cols-2">
		<ScanHistory
			entries={history}
			activeId={params.searchValue}
			onSelect={(id) => (params.searchValue = id)}
		/>

		{#if paymentTransaction && resultReady}
			<section
				class="flex flex-col gap-4 rounded-box border border-base-300 bg-base-200/50 p-5"
				aria-label={m.payment()}
			>
				<header class="flex items-center justify-between gap-2">
					<h3 class="flex items-center gap-2 text-lg font-bold">
						<i class="fa-sharp-duotone fa-solid fa-money-bill-transfer text-xl"></i>
						{m.payment()}
					</h3>
					<button
						type="button"
						class="btn btn-square btn-ghost btn-sm"
						onclick={resetView}
						aria-label={m.close()}
					>
						<i class="fa-sharp-duotone fa-solid fa-xmark text-lg"></i>
					</button>
				</header>

				{@render transactionDetails(paymentTransaction)}

				<footer class="flex gap-2 border-t border-base-300 pt-4">
					{#if !paymentTransaction.recievedAt}
						<button
							class="btn flex-1 btn-error"
							onclick={() => changeTransactionStatus('PROBLEM')}
							disabled={hotkeyDebounce}
						>
							<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation"></i>
							{m.markAsProblem()}
						</button>
						<button
							class="btn flex-1 btn-primary"
							onclick={markReceivedAndNext}
							disabled={hotkeyDebounce}
						>
							<i class="fa-sharp-duotone fa-solid fa-check"></i>
							{m.markAsRecieved()}
							<Kbd hotkey="alt+a" />
						</button>
					{:else}
						<button class="btn flex-1 btn-error" onclick={resetView}>
							<i class="fa-sharp-duotone fa-solid fa-xmark"></i>
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
					<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-3xl text-warning"></i>
					<p class="text-base-content/80">{m.noPaymentFound()}</p>
				{/if}
			</div>
		{/if}
	</div>
</div>

{#snippet referencedUser(user: NonNullable<typeof referencedUsers>[number], received: boolean)}
	{@const name = formatNames(user.givenName ?? undefined, user.familyName ?? undefined)}
	<div class="bg-base-200 flex w-full items-center gap-4 rounded-field px-4 py-2">
		<i class="fa-sharp-duotone fa-solid {paymentStatusIcon(user.id, received)} text-2xl"></i>
		<div class="text-lg font-bold">
			{name}
		</div>
		<div class="truncate text-sm opacity-60">{user.id}</div>
		<button
			class="btn btn-soft btn-sm ml-auto"
			onclick={() => openUserCard(user.id)}
			aria-label="Details for {name}"
		>
			<i class="fa-sharp-duotone fa-solid fa-id-card"></i>
		</button>
	</div>
{/snippet}

{#snippet transactionDetails(transaction: NonNullable<typeof paymentTransaction>)}
	<!-- Payment reference ID -->
	<div class="mb-4">
		<h1 class="font-mono text-2xl font-bold">{transaction.id}</h1>
		<p class="opacity-60">
			{new Date(transaction.createdAt).toLocaleString(undefined, {
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
			<i class="fa-sharp-duotone fa-solid fa-check text-2xl"></i>
			{m.paymentRecieved({ date: formatLongDate(transaction.recievedAt) })}
		</div>
	{/if}

	<!-- Amount display -->
	<div class="bg-base-200 mb-4 w-fit max-w-sm rounded-field p-3">
		<div class="font-mono text-3xl font-bold">
			{transaction.amount.toLocaleString(undefined, {
				style: 'currency',
				currency: conference?.currency ?? 'EUR'
			})}
		</div>
	</div>

	<!-- Referenced users -->
	<div class="flex flex-col gap-2">
		<h2 class="text-xl font-bold">{m.referencedUsers()}</h2>
		<div class="flex flex-col gap-2">
			{#each referencedUsers ?? [] as user (user.id)}
				{@render referencedUser(user, !!transaction.recievedAt)}
			{/each}
		</div>
	</div>
{/snippet}
