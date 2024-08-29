<script lang="ts">
	import ReviewTable from '$lib/components/ReviewTable.svelte';
	import { fly } from 'svelte/transition';
	import Spinner from '$lib/components/Spinner.svelte';
	import type { PageData } from '../supervisor/$types';
	import { apiClient, checkForError } from '$api/client';
	import * as m from '$lib/paraglide/messages.js';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();
	let api = apiClient({ origin: data.url.origin });

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

<div class="w-full min-h-screen flex flex-col items-center p-4">
	<main class="w-full h-full flex-1 flex flex-col items-center py-16 text-center">
		<h1 class="text-3xl tracking-wider uppercase mb-3">{m.signupForSupervisors()}</h1>
		<div in:fly={{ x: -50, duration: 300, delay: 300 }} out:fly={{ x: -50, duration: 300 }}>
			<div class="flex flex-col items-center">
				<p class="mb-10 max-ch-sm">
					{m.delegationJoinForSupervisorsDescription()}
				</p>
				{#if delegationPreview}
					{#await delegationPreview}
						<Spinner />
					{:then delegation}
						{#if delegation}
							<div
								class="flex flex-col items-center mb-10"
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
								<div class="flex flex-col-reverse sm:flex-row justify-between mt-4 gap-4 sm:gap-10">
									<button
										class="btn btn-primary"
										onclick={async () => {
											await checkForError(api.delegation.join.post({
												entryCode: code,
												joinAsSupervisor: true
											}));
											goto("/dashboard")
										}}>{m.confirm()}</button
									>
								</div>
							</div>
						{/if}
					{/await}
				{/if}
				<div class="join">
					<input
						type="text"
						placeholder="Code"
						bind:value={code}
						class="input input-bordered input-lg w-full max-w-xs tracking-[0.8rem] uppercase join-item font-mono"
						oninput={(e) => {
							code = (e.target.value as string).toUpperCase().slice(0, 6);
						}}
					/>
				</div>
				<a class="btn btn-warning mt-16" href=".">{m.back()}</a>
			</div>
		</div>
	</main>
</div>
