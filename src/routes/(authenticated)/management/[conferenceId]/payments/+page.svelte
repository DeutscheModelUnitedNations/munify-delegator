<script lang="ts">
	import { cache, graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { DatePicker } from '@svelte-plugins/datepicker';
	import { type PageData } from './$houdini';
	import { fly, fade } from 'svelte/transition';
	import type { AdministrativeStatus } from '@prisma/client';
	import formatNames from '$lib/services/formatNames';
	import { queryParameters } from 'sveltekit-search-params';

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

	const params = queryParameters({
		searchValue: {
			defaultValue: '',
			encode: (value) => value.trim(),
			decode: (value) => (value ?? '').trim()
		}
	});

	$effect(() => {
		$params.searchValue = $params.searchValue.trim();
	});

	let { data }: { data: PageData } = $props();

	let paymentTransaction = $derived($paymentReferenceByIdQuery.data?.findUniquePaymentTransaction);
	let referencedUsers = $derived($paymentReferenceByIdQuery.data?.findManyUsers);
	let conference = $derived($paymentReferenceByIdQuery.data?.findUniqueConference);

	const getPaymentStatus = (userId: string) => {
		const user = referencedUsers?.find((user) => user.id === userId);
		const status = user?.conferenceParticipantStatus.find(
			(status) => status.conference.id === data.conferenceId
		);
		return status ? status.paymentStatus : 'PENDING';
	};

	$effect(() => {
		paymentReferenceByIdQuery.fetch({
			variables: { conferenceId: data.conferenceId, reference: $params.searchValue }
		});
	});

	let recieveDate = $state<string>(new Date().toISOString().split('T')[0]);

	let loading = $state(false);

	const changeTransactionStatus = async (status: AdministrativeStatus) => {
		if (!paymentTransaction?.id) {
			console.error('No date or transaction id');
			return;
		}

		if (status === 'DONE' && !recieveDate) {
			console.error('No date selected');
			return;
		}

		loading = true;
		await changeReferenceMutation.mutate({
			reference: paymentTransaction?.id,
			status,
			recievedAt: recieveDate ? new Date(recieveDate) : undefined
		});
		cache.markStale();
		paymentReferenceByIdQuery.fetch({
			variables: { conferenceId: data.conferenceId, reference: $params.searchValue }
		});
		loading = false;
	};
</script>

<div class="flex w-full flex-col gap-8 p-10">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{m.payment()}</h2>
		<p>{@html m.paymentAdminDescription()}</p>
	</div>

	<input
		type="text"
		placeholder={m.referenceSearch()}
		class="input input-lg w-full"
		bind:value={$params.searchValue}
	/>

	{#if $paymentReferenceByIdQuery?.fetching}
		<div class="flex items-center gap-2">
			<i class="fa-duotone fa-spinner fa-spin text-3xl"></i>
		</div>
	{:else if $params.searchValue === ''}
		<div class="flex items-center gap-2">
			<i class="fa-duotone fa-pen-field text-3xl"></i>
			{m.waitingForYourInput()}
		</div>
	{:else if !$paymentReferenceByIdQuery?.data?.findUniquePaymentTransaction}
		<div class="flex items-center gap-2">
			<i class="fa-duotone fa-ban text-3xl"></i>
			{m.noPaymentFound()}
		</div>
	{:else}
		<div
			class="bg-base-200 flex w-full flex-col gap-4 rounded-lg p-4 shadow-md md:p-10"
			in:fly={{ y: -10, duration: 300 }}
		>
			<div>
				<h1 class="font-mono text-2xl font-bold">{paymentTransaction?.id}</h1>
				<h3 class="opacity-60">
					{new Date().toLocaleString(undefined, {
						year: 'numeric',
						month: 'long',
						day: 'numeric',
						hour: 'numeric',
						minute: 'numeric',
						second: 'numeric'
					})}
				</h3>
			</div>

			{#if paymentTransaction?.recievedAt}
				<div class="alert alert-success">
					<i class="fas fa-check text-2xl"></i>
					{m.paymentRecieved({
						date: new Date(paymentTransaction.recievedAt).toLocaleDateString(undefined, {
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})
					})}
				</div>
			{/if}

			<div class="bg-base-100 w-fit max-w-sm rounded-md p-2">
				<div class="font-mono text-3xl font-bold">
					{paymentTransaction?.amount.toLocaleString(undefined, {
						style: 'currency',
						currency: conference?.currency ?? 'EUR'
					})}
				</div>
			</div>

			<div class="flex flex-col gap-2">
				<h2 class="text-xl font-bold">{m.referencedUsers()}</h2>
				<div class="flex flex-col gap-2">
					{#each referencedUsers ?? [] as user}
						<div class="bg-base-100 flex w-full items-center gap-4 rounded-md px-4 py-2">
							{#if getPaymentStatus(user.id) === 'DONE'}
								{#if paymentTransaction?.recievedAt}
									<i class="fa-duotone fa-check text-2xl"></i>
								{:else}
									<i class="fa-duotone fa-circle-exclamation-check fa-beat-fade text-2xl"></i>
								{/if}
							{:else if getPaymentStatus(user.id) === 'PROBLEM'}
								<i class="fa-duotone fa-triangle-exclamation fa-beat-fade text-2xl"></i>
							{:else}
								<i class="fa-duotone fa-hourglass-half text-2xl"></i>
							{/if}
							<div class="text-lg font-bold">{formatNames(user.given_name, user.family_name)}</div>
							<div>{user.id}</div>
							<a
								class="btn btn-ghost btn-sm"
								href="/management/{data.conferenceId}/participants?selected={user.id}"
								aria-label="Details for {formatNames(user.given_name, user.family_name)}"
							>
								<i class="fa-duotone fa-up-right-from-square"></i>
							</a>
						</div>
					{/each}
				</div>
			</div>

			{#if !paymentTransaction?.recievedAt}
				<div class="flex flex-col gap-4 sm:flex-row">
					<button class="btn btn-error" onclick={() => changeTransactionStatus('PROBLEM')}>
						{#if loading}
							<i class="fa-duotone fa-spinner fa-spin"></i>
						{:else}
							<i class="fas fa-triangle-exclamation"></i>
						{/if}
						{m.markAsProblem()}
					</button>
					<button class="btn btn-success" onclick={() => changeTransactionStatus('DONE')}>
						{#if loading}
							<i class="fa-duotone fa-spinner fa-spin"></i>
						{:else}
							<i class="fas fa-check"></i>
						{/if}
						{m.markAsRecieved()}
					</button>
				</div>
			{/if}
		</div>
	{/if}
</div>
