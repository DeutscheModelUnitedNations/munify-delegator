<script lang="ts">
	import type { User } from '@prisma/client';

	interface Props {
		headline: string;
		items: User[];
		link: string;
	}

	let { headline, items, link }: Props = $props();
</script>

{#if items.length > 0}
	<div class="flex flex-col gap-4">
		<h2 class="text-2xl font-bold">{headline}</h2>
		<div class="w-fit">
			<table class="table">
				<tbody>
					{#each items as user}
						<tr>
							<td>{user.given_name} <span class="uppercase">{user.family_name}</span></td>
							<td>
								<a href={`${link}${user.id}`} class="btn btn-sm" aria-label="Details">
									<i class="fa-duotone fa-arrow-up-right-from-square"></i>
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}
