<script lang="ts">
	import formatNames from '#lib/helpers/formatNames';

	/** The people a payment covers, as badges. */
	let {
		users
	}: { users: readonly { id: string; givenName: string | null; familyName: string | null }[] } =
		$props();
</script>

<ul class="flex flex-wrap gap-1">
	{#each users as user (user.id)}
		<li class="badge badge-neutral">
			{formatNames({
				givenName: user.givenName ?? undefined,
				familyName: user.familyName ?? undefined
			})}
		</li>
	{/each}
</ul>
