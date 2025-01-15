<script lang="ts">
	import formatNames from '$lib/services/formatNames';
	import type { User } from '@prisma/client';

	interface Props {
		headline: string;
		items: Pick<User, 'family_name' | 'given_name' | 'id'>[];
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
							<td>{formatNames(user.given_name, user.family_name)}</td>
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
