<script lang="ts">
	/**
	 * A page as the app writes them: an `await` at the top of the script, then state the template
	 * reads. When the `await` fails, that state is never assigned.
	 */
	let { load }: { load: () => Promise<string> } = $props();

	const value = $derived(await load());
	let opened = $state(false);
</script>

<p data-content data-opened={opened}>{value}</p>
