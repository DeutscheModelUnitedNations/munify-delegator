<script lang="ts">
	/**
	 * Raw HTML in the markdown, shown as the text it is. The default renderer hands it to `{@html}`,
	 * which lets whoever writes the markdown (the team, for the announcement) run script in the
	 * browser of everybody who reads it.
	 */
	let { token }: { token: { text: string } } = $props();
</script>

{token.text}
