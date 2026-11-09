<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';

	/** Where the presence below comes from while CHASE is linked, and "Read again". */
	interface Props {
		/** A file was uploaded, which the page shows instead. */
		fromFile: boolean;
		/** CHASE could not be asked. */
		failed: boolean;
		/** When CHASE was asked, if it reported anyone. */
		readAt: string | undefined;
		onReadAgain: () => void;
	}

	let { fromFile, failed, readAt, onReadAgain }: Props = $props();

	const message = $derived.by(() => {
		if (fromFile) return m.importPresenceFileInsteadOfChase();
		if (failed) return m.importPresenceFromChaseFailed();
		if (!readAt) return m.importPresenceFromChaseNothingYet();
		const time = new Date(readAt).toLocaleString(getLocale(), {
			dateStyle: 'medium',
			timeStyle: 'short'
		});
		return m.importPresenceFromChase({ time });
	});
</script>

<div class="alert {fromFile ? 'alert-warning' : 'alert-info'} mt-4">
	<i aria-hidden="true" class="ph-duotone ph-link"></i>
	<span>{message}</span>
	{#if !fromFile}
		<button class="btn btn-sm btn-ghost" onclick={onReadAgain}>
			<i aria-hidden="true" class="ph-duotone ph-arrows-clockwise"></i>
			{m.importPresenceReadAgain()}
		</button>
	{/if}
</div>
