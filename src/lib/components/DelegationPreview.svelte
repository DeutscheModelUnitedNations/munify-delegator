<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import { fly } from 'svelte/transition';
	import Spinner from './Spinner.svelte';
	import { m } from '$lib/paraglide/messages';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	interface Props {
		conferenceId: string;
		entryCode: string;
	}

	let { conferenceId, entryCode }: Props = $props();

	function fetchPreview() {
		return client.query.previewDelegation({
			__args: { conferenceId, entryCode },
			memberCount: true,
			applied: true,
			headDelegateFullName: true,
			conferenceTitle: true,
			school: true
		});
	}

	let delegation = $state<Awaited<ReturnType<typeof fetchPreview>>>();
	let previewLoading = $state(false);
	let previewFailed = $state(false);

	$effect(() => {
		if (!entryCode) return;
		previewLoading = true;
		previewFailed = false;
		void fetchPreview()
			.then((result) => {
				delegation = result;
			})
			.catch(() => {
				previewFailed = true;
			})
			.finally(() => {
				previewLoading = false;
			});
	});
</script>

{#if previewLoading}
	<Spinner />
{:else if previewFailed}
	<div
		class="alert alert-warning"
		in:fly={{ x: 50, duration: 300, delay: 300 }}
		out:fly={{ x: 50, duration: 300 }}
	>
		<i class="fas fa-triangle-exclamation"></i>
		<div>
			{m.noDelegationsFound()}
		</div>
	</div>
{:else if delegation}
	<div
		class="mb-10 flex flex-col items-center"
		in:fly={{ x: 50, duration: 300, delay: 300 }}
		out:fly={{ x: 50, duration: 300 }}
	>
		<div class="bg-base-100 dark:bg-base-200 rounded-box p-4 shadow-lg dark:stroke-slate-300">
			<div class="overflow-x-auto">
				<table class="table">
					<tbody>
						<tr>
							<td>{m.conference()}</td>
							<td>{delegation?.conferenceTitle}</td>
						</tr>
						<tr>
							<td>{m.schoolOrInstitution()}</td>
							<td>{delegation?.school}</td>
						</tr>
						<tr>
							<td>{m.headDelegate()}</td>
							<td>{delegation?.headDelegateFullName}</td>
						</tr>
						<tr>
							<td>{m.amountOfDelegates()}</td>
							<td>{delegation?.memberCount}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
		<button
			class="btn btn-primary mt-10"
			onclick={async () => {
				await client.mutate.createDelegationMember({
					__args: { entryCode, conferenceId },
					id: true
				});
				goto(resolve('/(authenticated)/dashboard/[conferenceId]', { conferenceId }));
			}}>{m.confirm()}</button
		>
	</div>
{/if}
