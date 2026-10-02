<script lang="ts">
	import { client, type AdministrativestatusEnum } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/helpers/formatNames';
	import hotkeys from 'hotkeys-js';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import TopDrawer from '$lib/components/TopDrawer.svelte';
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

	// Drawer state
	let showPaymentDrawer = $state(false);
	let lastLoadedReference = $state('');

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

	// Drawer open/close management with stale data prevention
	$effect(() => {
		const searchVal = params.searchValue;
		if (!searchVal) {
			showPaymentDrawer = false;
			lastLoadedReference = '';
			return;
		}
		if (searchVal !== lastLoadedReference) {
			showPaymentDrawer = false;
		}
	});
	$effect(() => {
		const searchVal = params.searchValue;
		if (transactionReadyFor(searchVal, paymentTransaction?.id, referenceFetching)) {
			lastLoadedReference = searchVal;
			showPaymentDrawer = true;
		}
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
			showPaymentDrawer = false;
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
		showPaymentDrawer = false;
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

<div class="flex w-full flex-col gap-8 md:p-10">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{m.payment()}</h2>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
		<p>{@html m.paymentAdminDescription()}</p>
		<!-- Show last confirmed transaction if available -->
		{#if lastReceived}
			<div class="alert alert-success">
				<i class="fa-solid fa-money-bill-transfer text-lg"></i>
				<div>
					{m.latestPayment({ id: lastReceived.id, date: formatLongDate(lastReceived.recievedAt) })}
				</div>
			</div>
		{/if}
		<FormFieldset title={m.referenceSearch()}>
			<div class="join w-full">
				<input
					type="text"
					bind:this={searchInputElem}
					placeholder={m.referenceSearch()}
					class="input input-lg join-item w-full"
					bind:value={params.searchValue}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							searchInputElem?.blur();
						}
					}}
				/>
				<button
					class="btn btn-primary btn-lg join-item"
					aria-label="Search"
					onclick={() => searchInputElem?.blur()}
				>
					<i class="fa-solid fa-magnifying-glass"></i>
				</button>
			</div>
		</FormFieldset>
	</div>

	<!-- Loading / error state -->
	{#if params.searchValue && referenceFetching}
		<div class="flex items-center justify-center py-4">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if params.searchValue && !paymentTransaction && !referenceFetching}
		<div class="alert alert-warning">
			<i class="fa-solid fa-triangle-exclamation text-lg"></i>
			<div>{m.noPaymentFound()}</div>
		</div>
	{/if}
</div>

{#snippet referencedUser(user: NonNullable<typeof referencedUsers>[number], received: boolean)}
	{@const name = formatNames(user.givenName ?? undefined, user.familyName ?? undefined)}
	<div class="bg-base-200 flex w-full items-center gap-4 rounded-md px-4 py-2">
		<i class="fa-duotone {paymentStatusIcon(user.id, received)} text-2xl"></i>
		<div class="text-lg font-bold">
			{name}
		</div>
		<div class="truncate text-sm opacity-60">{user.id}</div>
		<button
			class="btn btn-soft btn-sm ml-auto"
			onclick={() => openUserCard(user.id, routeParams.conferenceId)}
			aria-label="Details for {name}"
		>
			<i class="fa-duotone fa-id-card"></i>
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
			<i class="fa-duotone fa-check text-2xl"></i>
			{m.paymentRecieved({ date: formatLongDate(transaction.recievedAt) })}
		</div>
	{/if}

	<!-- Amount display -->
	<div class="bg-base-200 mb-4 w-fit max-w-sm rounded-md p-3">
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

<!-- Top drawer overlay for payment data -->
<TopDrawer bind:open={showPaymentDrawer} title={m.payment()} titleIcon="fa-money-bill-transfer">
	{#snippet headerActions()}
		<button
			type="button"
			class="btn btn-ghost btn-sm btn-square"
			onclick={() => resetView()}
			aria-label={m.close()}
		>
			<i class="fa-duotone fa-xmark text-lg"></i>
		</button>
	{/snippet}

	{#if paymentTransaction && paymentTransaction.id === params.searchValue}
		{@render transactionDetails(paymentTransaction)}
	{/if}

	{#snippet footer()}
		{#if paymentTransaction && !paymentTransaction.recievedAt}
			<button
				class="btn btn-error flex-1"
				onclick={() => changeTransactionStatus('PROBLEM')}
				disabled={hotkeyDebounce}
			>
				<i class="fa-solid fa-triangle-exclamation"></i>
				{m.markAsProblem()}
			</button>
			<button
				class="btn btn-success flex-1"
				onclick={markReceivedAndNext}
				disabled={hotkeyDebounce}
			>
				<i class="fa-solid fa-check"></i>
				{m.markAsRecieved()}
				<Kbd hotkey="alt+a" />
			</button>
		{:else}
			<button class="btn btn-error flex-1" onclick={resetView}>
				<i class="fa-solid fa-xmark"></i>
				{m.close()}
				<Kbd hotkey="Esc" />
			</button>
		{/if}
	{/snippet}
</TopDrawer>
