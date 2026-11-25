<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import Modal from '#lib/components/Modal.svelte';
	import type { Audience } from '#lib/guide/outline';
	import AudienceSelect from '../AudienceSelect.svelte';

	/** Who sees a section: chosen in a dialog from the section's menu. */
	interface Props {
		open: boolean;
		title: string;
		value: Audience;
		roles: readonly { id: string; name: string }[];
		onChange: (audience: Audience) => void;
	}

	let { open = $bindable(), title, value, roles, onChange }: Props = $props();
</script>

<Modal bind:open title={m.guideTreeAudienceOf({ section: title })}>
	<div class="flex flex-col gap-2">
		<AudienceSelect
			{value}
			{roles}
			label={m.guideAudience()}
			onChange={(audience) => audience && onChange(audience)}
		/>
		<p class="text-sm opacity-70">{m.guideTreeAudienceHint()}</p>
	</div>
	{#snippet action()}
		<button class="btn" type="button" onclick={() => (open = false)}>{m.close()}</button>
	{/snippet}
</Modal>
