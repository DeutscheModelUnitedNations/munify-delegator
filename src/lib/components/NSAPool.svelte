<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type * as schema from '#api/db/schema/index';
	import type { Snippet } from 'svelte';
	import Flag from './Flag.svelte';

	type NonStateActorPool = Pick<
		typeof schema.conferenceRole.$inferSelect,
		'id' | 'name' | 'description' | 'seatAmount' | 'icon'
	>[];

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
				<th><i class="ph-duotone ph-megaphone-simple"></i></th>
				<th><i class="ph-duotone ph-info"></i></th>
				<th class="text-center"><i class="ph-duotone ph-users"></i></th>
				{#if actionCell}<th><span class="sr-only">{m.actions()}</span></th>{/if}
			</tr>
		</thead>
		<tbody>
			{#each nonStateActorPool.toSorted( (a, b) => (a.name ?? '').localeCompare(b.name ?? '') ) as nsa (nsa.id)}
				<tr>
					<td class="align-top md:align-middle">
						<div class="flex items-center gap-4">
							<Flag nsa icon={nsa.icon ?? undefined} size="xs" />
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
