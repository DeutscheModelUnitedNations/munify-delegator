<script lang="ts">
	import ReviewTable from '$lib/components/ReviewTable.svelte';
	import { fly } from 'svelte/transition';
	import Spinner from '$lib/components/Spinner.svelte';
	import type { PageData } from './$types';
	import { apiClient, checkForError } from '$api/client';
	import * as m from '$lib/paraglide/messages.js';
	import { goto } from '$app/navigation';
	import RegistrationBreadcrumbs from '$lib/components/RegistrationBreadcrumbs.svelte';

	let { data }: { data: PageData } = $props();
	let api = apiClient({ origin: data.url.origin });

	const breadcrumbs = [
		{ href: '/registration', icon: 'user-plus' },
		{
			href: `/registration/${data.conferenceId}`,
			title: data.conferenceData.title
		},
		{
			href: `/registration/${data.conferenceId}/join`,
			title: m.joinDelegation(),
			icon: 'arrow-right-to-bracket'
		}
	];

	let code = $state(data.code ?? '');
	let delegationPreview = $derived(
		(async () => {
			if (code && code.length === 6) {
				return await checkForError(
					api.delegation.preview.get({
						query: {
							entryCode: code,
							conferenceId: data.conferenceId
						}
					})
				);
			}
		})()
	);
</script>

<div class="flex min-h-screen w-full flex-col items-center p-4">
	<RegistrationBreadcrumbs {breadcrumbs} />
	<main class="flex h-full w-full flex-1 flex-col items-center py-16 text-center">
		<h1 class="mb-3 text-3xl uppercase tracking-wider">{m.joinDelegation()}</h1>
		<div in:fly={{ x: -50, duration: 300, delay: 300 }} out:fly={{ x: -50, duration: 300 }}>
			<div class="flex flex-col items-center">
				<p class="mb-10 max-ch-sm">
					{m.pleaseCheckDelegation()}
				</p>
				{#if delegationPreview}
					{#await delegationPreview}
						<Spinner />
					{:then delegation}
						{#if delegation}
							<div
								class="mb-10 flex flex-col items-center"
								in:fly={{ x: 50, duration: 300, delay: 300 }}
								out:fly={{ x: 50, duration: 300 }}
							>
								<ReviewTable>
									<tr>
										<td>{m.conference()}</td>
										<td>{delegation.conferenceTitle}</td>
									</tr>
									<tr>
										<td>{m.schoolOrInstitution()}</td>
										<td>{delegation.school}</td>
									</tr>
									<tr>
										<td>{m.headDelegate()}</td>
										<td>{delegation.headDelegateFullName}</td>
									</tr>
									<tr>
										<td>{m.amountOfDelegates()}</td>
										<td>{delegation.memberCount}</td>
									</tr>
								</ReviewTable>
								<div class="mt-4 flex flex-col-reverse justify-between gap-4 sm:flex-row sm:gap-10">
									<button
										class="btn btn-primary"
										onclick={async () => {
											await checkForError(
												api.delegation.join.post({
													entryCode: code
												})
											);
											goto('/dashboard');
										}}>{m.confirm()}</button
									>
								</div>
							</div>
						{/if}
					{/await}
				{/if}
				<input
					type="text"
					placeholder="Code"
					bind:value={code}
					class="input input-lg join-item input-bordered w-full max-w-xs font-mono uppercase tracking-[0.8rem]"
					oninput={(e: any) => {
						code = (e.target.value as string).toUpperCase().slice(0, 6);
					}}
				/>
				<a class="btn btn-warning mt-16" href=".">{m.back()}</a>
			</div>
		</div>
	</main>
</div>
