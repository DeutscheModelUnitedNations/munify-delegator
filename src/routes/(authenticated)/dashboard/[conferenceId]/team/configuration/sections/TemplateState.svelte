<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** Where a template stands: removed or replaced on the next save, stored, or still missing. */
	let { state }: { state: 'removed' | 'pending' | 'stored' | 'missing' } = $props();

	const looks = $derived(
		{
			removed: { tone: 'text-error', icon: 'trash', text: m.templateRemovalPending() },
			pending: { tone: 'text-info', icon: 'cloud-arrow-up', text: m.templatePending() },
			stored: { tone: 'text-success', icon: 'check-circle', text: m.templateStored() },
			missing: { tone: 'text-warning', icon: 'warning-circle', text: m.templateMissing() }
		}[state]
	);
</script>

<!-- an icon only, its words for the tooltip and screen readers -->
<span class="tooltip tooltip-left {looks.tone}" data-tip={looks.text}>
	<i aria-hidden="true" class="ph-duotone ph-{looks.icon} text-xl"></i>
	<span class="sr-only">{looks.text}</span>
</span>
