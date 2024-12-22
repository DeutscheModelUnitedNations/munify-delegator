<script lang="ts">
	import { graphql } from '$houdini';
	import { fly } from 'svelte/transition';
	import type { DelegationPreviewComponentQueryVariables } from './$houdini';
	import Spinner from './Spinner.svelte';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		conferenceId: string;
		entryCode: string;
	}

	let { conferenceId, entryCode }: Props = $props();

	export const _DelegationPreviewComponentQueryVariables: DelegationPreviewComponentQueryVariables =
		({ props }: { props: Props }) => {
			return props;
		};

	const delegationQuery = graphql(`
		query DelegationPreviewComponentQuery($conferenceId: String!, $entryCode: String!) @load {
			previewDelegation(conferenceId: $conferenceId, entryCode: $entryCode) {
				memberCount
				applied
				headDelegateFullName
				conferenceTitle
				school
			}
		}
	`);

	let delegation = $derived($delegationQuery.data!.previewDelegation!);
</script>

{#if $delegationQuery.fetching}
	<Spinner />
{:else}
	<div
		class="mb-10 flex flex-col items-center"
		in:fly={{ x: 50, duration: 300, delay: 300 }}
		out:fly={{ x: 50, duration: 300 }}
	>
		<div class="rounded-lg bg-base-100 p-4 shadow-lg dark:bg-base-200 dark:stroke-slate-300">
			<div class="overflow-x-auto">
				<table class="table">
					<tbody>
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
					</tbody>
				</table>
			</div>
		</div>
	</div>
{/if}
