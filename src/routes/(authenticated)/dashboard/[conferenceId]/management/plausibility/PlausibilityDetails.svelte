<script lang="ts">
	import formatNames from '$lib/helpers/formatNames';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	interface Props {
		headline: string;
		items: { id: string; givenName: string | null; familyName: string | null }[];
	}

	let { headline, items }: Props = $props();
</script>

{#if items.length > 0}
	<div class="flex flex-col gap-4">
		<h2 class="text-2xl font-bold">{headline}</h2>
		<div class="w-fit">
			<table class="table">
				<tbody>
					{#each items as user (user.id)}
						<tr>
							<td>{formatNames(user.givenName ?? undefined, user.familyName ?? undefined)}</td>
							<td>
								<button
									class="btn btn-sm"
									onclick={() => openUserCard(user.id)}
									aria-label="Details"
								>
									<i class="fa-sharp-duotone fa-solid fa-id-card"></i>
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}
