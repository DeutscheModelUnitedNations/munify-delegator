<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** Where a template stands: removed or replaced on the next save, stored, or still missing. */
	let { state }: { state: 'removed' | 'pending' | 'stored' | 'missing' } = $props();

	const looks = $derived(
		{
			removed: { tone: 'badge-error', icon: 'trash', text: m.templateRemovalPending() },
			pending: { tone: 'badge-info', icon: 'cloud-arrow-up', text: m.templatePending() },
			stored: { tone: 'badge-success', icon: 'check-circle', text: m.templateStored() },
			missing: { tone: 'badge-warning', icon: 'warning-circle', text: m.templateMissing() }
		}[state]
	);
</script>

<span class="badge badge-soft badge-sm {looks.tone}">
	<i aria-hidden="true" class="ph-duotone ph-{looks.icon}"></i>{looks.text}
</span>
