<script lang="ts">
	import formatNames from '$lib/services/formatNames';
	import { openUserCard } from '$lib/components/UserCard/userCardState.svelte';
	import type { User } from '@prisma/client';

	interface Props {
		headline: string;
		items: Pick<User, 'family_name' | 'given_name' | 'id'>[];
		conferenceId: string;
	}

	let { headline, items, conferenceId }: Props = $props();
</script>

{#if items.length > 0}
	<div class="flex flex-col gap-4">
		<h2 class="text-2xl font-bold">{headline}</h2>
		<div class="w-fit">
			<table class="table">
				<tbody>
					{#each items as user}
						<tr>
							<td>{formatNames(user.given_name, user.family_name)}</td>
							<td>
								<button
									class="btn btn-sm"
									onclick={() => openUserCard(user.id, conferenceId)}
									aria-label="Details"
								>
									<i class="fa-duotone fa-id-card"></i>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}
