<script lang="ts">
	import { cache, graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { type PageData } from './$houdini';
	import type { AdministrativeStatus } from '@prisma/client';
	import formatNames from '$lib/services/formatNames';
	import hotkeys from 'hotkeys-js';
	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import FormFieldset from '$lib/components/Form/FormFieldset.svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import TopDrawer from '$lib/components/TopDrawer.svelte';
	import Kbd from '$lib/components/Kbd.svelte';

	let { data }: { data: PageData } = $props();

	let params = queryParameters({
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

	const paymentReferenceByIdQuery = graphql(`
		query PaymentReferenceByIdQuery($reference: String!, $conferenceId: String!) {
			findUniquePaymentTransaction(
				where: { id: $reference, conferenceId: { equals: $conferenceId } }
			) {
				id
				amount
				createdAt
				recievedAt
			}
			findManyUsers(
				where: {
					paymentTransactionsReferences: {
						some: { paymentTransaction: { id: { equals: $reference } } }
					}
				}
			) {
				id
				conferenceParticipantStatus {
					conference {
						id
					}
					paymentStatus
				}
				given_name
				family_name
			}
			findUniqueConference(where: { id: $conferenceId }) {
				currency
			}
		}
	`);

	const changeReferenceMutation = graphql(`
		mutation ChangeReferenceMutation(
			$reference: ID!
			$status: AdministrativeStatus!
			$recievedAt: DateTime
		) {
			updateOnePaymentTransaction(
				id: $reference
				assignedStatus: $status
				recievedAt: $recievedAt
			) {
				id
				recievedAt
			}
		}
	`);

	let paymentTransaction = $derived($paymentReferenceByIdQuery.data?.findUniquePaymentTransaction);
	let referencedUsers = $derived($paymentReferenceByIdQuery.data?.findManyUsers);
	let conference = $derived($paymentReferenceByIdQuery.data?.findUniqueConference);

	let recieveDate = $state<string>(new Date().toISOString().split('T')[0]);

	const getPaymentStatus = (userId: string) => {
		const user = referencedUsers?.find((user) => user.id === userId);
		const status = user?.conferenceParticipantStatus.find(
			(status) => status.conference.id === data.conferenceId
		);
		return status ? status.paymentStatus : 'PENDING';
	};

	// --- Effects ---

	// Fetch payment data when search value changes
	$effect(() => {
		if ($params.searchValue) {
			paymentReferenceByIdQuery.fetch({
				variables: { conferenceId: data.conferenceId, reference: $params.searchValue }
			});
		}
	});

	// Drawer open/close management with stale data prevention
	$effect(() => {
		const searchVal = $params.searchValue;
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
		const searchVal = $params.searchValue;
		if (
			searchVal &&
			$paymentReferenceByIdQuery.data?.findUniquePaymentTransaction &&
			!$paymentReferenceByIdQuery.fetching
		) {
			lastLoadedReference = searchVal;
			showPaymentDrawer = true;
		}
	});

	// --- Actions ---

	const changeTransactionStatus = async (status: AdministrativeStatus) => {
		if (!paymentTransaction?.id) {
			console.error('No transaction id');
			return;
		}

		if (status === 'DONE' && !recieveDate) {
			console.error('No date selected');
			return;
		}

		const promise = changeReferenceMutation.mutate({
			reference: paymentTransaction.id,
			status,
			recievedAt: recieveDate ? new Date(recieveDate) : undefined
		});
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		cache.markStale();
		paymentReferenceByIdQuery.fetch({
			variables: { conferenceId: data.conferenceId, reference: $params.searchValue }
		});
	};

	const markReceivedAndNext = async () => {
		if (hotkeyDebounce) return;
		hotkeyDebounce = true;

		try {
			recieveDate = new Date().toISOString().split('T')[0];
			await changeTransactionStatus('DONE');
			showPaymentDrawer = false;
			$params.searchValue = '';
			setTimeout(() => {
				searchInputElem?.focus();
			}, 300);
		} finally {
			hotkeyDebounce = false;
		}
	};

	const resetView = () => {
		showPaymentDrawer = false;
		$params.searchValue = '';
		setTimeout(() => {
			searchInputElem?.focus();
		}, 300);
	};

	// --- Hotkeys ---

	onMount(() => {
		hotkeys('esc', () => {
			resetView();
		});

		hotkeys('alt+a', () => {
			if (
				$params.searchValue &&
				paymentTransaction &&
				!paymentTransaction.recievedAt &&
				!hotkeyDebounce
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

<div class="flex w-full flex-col gap-8 md:p-10">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{m.payment()}</h2>
		<p>{@html m.paymentAdminDescription()}</p>

		<FormFieldset title={m.referenceSearch()}>
			<div class="join w-full">
				<input
					type="text"
					bind:this={searchInputElem}
					placeholder={m.referenceSearch()}
					class="input input-lg join-item w-full"
					bind:value={$params.searchValue}
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
	{#if $params.searchValue && $paymentReferenceByIdQuery?.fetching}
		<div class="flex items-center justify-center py-4">
			<span class="loading loading-spinner loading-lg"></span>
		</div>
	{:else if $params.searchValue && !$paymentReferenceByIdQuery?.data?.findUniquePaymentTransaction && !$paymentReferenceByIdQuery?.fetching}
		<div class="alert alert-warning">
			<i class="fa-solid fa-triangle-exclamation text-lg"></i>
			<div>{m.noPaymentFound()}</div>
		</div>
	{/if}
</div>

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

	{#if paymentTransaction && paymentTransaction.id === $params.searchValue}
		<!-- Payment reference ID -->
		<div class="mb-4">
			<h1 class="font-mono text-2xl font-bold">{paymentTransaction.id}</h1>
			<p class="opacity-60">
				{new Date(paymentTransaction.createdAt).toLocaleString(undefined, {
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
		{#if paymentTransaction.recievedAt}
			<div class="alert alert-success mb-4">
				<i class="fa-duotone fa-check text-2xl"></i>
				{m.paymentRecieved({
					date: new Date(paymentTransaction.recievedAt).toLocaleDateString(undefined, {
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})
				})}
			</div>
		{/if}

		<!-- Amount display -->
		<div class="bg-base-200 mb-4 w-fit max-w-sm rounded-md p-3">
			<div class="font-mono text-3xl font-bold">
				{paymentTransaction.amount.toLocaleString(undefined, {
					style: 'currency',
					currency: conference?.currency ?? 'EUR'
				})}
			</div>
		</div>

		<!-- Referenced users -->
		<div class="flex flex-col gap-2">
			<h2 class="text-xl font-bold">{m.referencedUsers()}</h2>
			<div class="flex flex-col gap-2">
				{#each referencedUsers ?? [] as user}
					<div class="bg-base-200 flex w-full items-center gap-4 rounded-md px-4 py-2">
						{#if getPaymentStatus(user.id) === 'DONE'}
							{#if paymentTransaction.recievedAt}
								<i class="fa-duotone fa-check text-2xl"></i>
							{:else}
								<i class="fa-duotone fa-circle-exclamation-check fa-beat-fade text-2xl"></i>
							{/if}
						{:else if getPaymentStatus(user.id) === 'PROBLEM'}
							<i class="fa-duotone fa-triangle-exclamation fa-beat-fade text-2xl"></i>
						{:else}
							<i class="fa-duotone fa-hourglass-half text-2xl"></i>
						{/if}
						<div class="text-lg font-bold">
							{formatNames(user.given_name, user.family_name)}
						</div>
						<div class="truncate text-sm opacity-60">{user.id}</div>
						<a
							class="btn btn-soft btn-sm ml-auto"
							href="/management/{data.conferenceId}/participants?selected={user.id}"
							aria-label="Details for {formatNames(user.given_name, user.family_name)}"
						>
							<i class="fa-duotone fa-up-right-from-square"></i>
						</a>
					</div>
				{/each}
			</div>
		</div>
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
