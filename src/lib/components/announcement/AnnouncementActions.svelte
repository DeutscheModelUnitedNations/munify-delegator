<!--
	@component
	What a reader can do with an announcement's card: unfold a long text and mark it as read.
	Renders nothing when neither applies.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	interface Props {
		/** The text is long enough to fold. */
		foldable: boolean;
		opened: boolean;
		unread: boolean;
		ontoggle: () => void;
		/** Left out where the card cannot be marked (a preview). */
		onread?: () => void;
	}

	let { foldable, opened, unread, ontoggle, onread }: Props = $props();

	const markable = $derived(unread && !!onread);
</script>

{#if foldable || markable}
	<div class="flex flex-wrap gap-2">
		{#if foldable}
			<button class="btn btn-ghost btn-sm" aria-expanded={opened} onclick={ontoggle}>
				<i aria-hidden="true" class="ph-duotone {opened ? 'ph-caret-up' : 'ph-caret-down'}"></i>
				{opened ? m.showLess() : m.showMore()}
			</button>
		{/if}
		{#if markable}
			<button class="btn btn-ghost btn-sm" onclick={() => onread?.()}>
				<i aria-hidden="true" class="ph-duotone ph-check"></i>
				{m.announcementMarkRead()}
			</button>
		{/if}
	</div>
{/if}
