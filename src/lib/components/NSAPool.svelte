<script lang="ts">
	import type { MyConferenceparticipationQuery$result } from '$houdini';
	import type { Snippet } from 'svelte';
	import Flag from './Flag.svelte';

	type NonStateActorPool = NonNullable<
		MyConferenceparticipationQuery$result['findUniqueConference']
	>['nonStateActors'];

	interface Props {
		nonStateActorPool: NonStateActorPool;
		actionCell?: Snippet<[NonStateActorPool[number]]>;
	}

	let { nonStateActorPool, actionCell }: Props = $props();
</script>

<div class="w-full overflow-x-auto">
	<table class="table">
		<thead>
			<tr>
				<th><i class="fa-duotone fa-megaphone"></i></th>
				<th><i class="fa-duotone fa-info"></i></th>
				<th class="text-center"><i class="fa-duotone fa-users"></i></th>
				{#if actionCell}<th></th>{/if}
			</tr>
		</thead>
		<tbody>
			{#each nonStateActorPool.sort((a, b) => a.name.localeCompare(b.name)) as nsa}
				<tr>
					<td class="align-top md:align-middle">
						<div class="flex items-center gap-4">
							<Flag nsa icon={nsa.fontAwesomeIcon ?? undefined} size="xs" />
							<span>{nsa.name}</span>
						</div>
					</td>
					<td><span class="text-sm">{nsa.description}</span></td>
					<td class="center align-top md:align-middle">{nsa.seatAmount}</td>
					{#if actionCell}
						<td class="align-top md:align-middle">
							{@render actionCell?.(nsa)}
						</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
