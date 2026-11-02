<script lang="ts">
	/**
	 * Placed after a tab's content inside its boundary, reports once the tab has all its data. Not on
	 * mount: a section's queries only start once the tab's own have answered, so the tab is ready when
	 * its boundary has had nothing pending for a moment.
	 */
	let { onready }: { onready: () => void } = $props();

	const SETTLED_MS = 250;
	const pending = $derived($effect.pending());
	let reported = false;

	$effect(() => {
		if (pending > 0 || reported) return;
		const timer = setTimeout(() => {
			reported = true;
			onready();
		}, SETTLED_MS);
		return () => clearTimeout(timer);
	});
</script>
