<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { AgreementField } from '#lib/paperScan/agreementDetails';
	import { fieldLabel } from '#lib/paperScan/fieldLabels';
	import type { FieldState } from '#lib/paperScan/readPaper';
	import StateMenu from '#lib/components/userCard/ui/StateMenu.svelte';
	import { agreementStateOptions } from './agreementState';

	/** One detail of what the person agreed to: its state, and whether a person or a scan set it. */
	interface Props {
		field: AgreementField;
		/** Nothing while the detail is not known. */
		detail: { state: FieldState; source: string } | undefined;
		onChange: (state: FieldState | null) => void;
	}

	let { field, detail, onChange }: Props = $props();

	const label = $derived(fieldLabel[field]());
	const manual = $derived(detail?.source === 'MANUAL');
	const source = $derived(manual ? m.agreementSourceManual() : m.agreementSourceScan());
</script>

<li class="flex items-center gap-x-3 py-1 text-sm">
	<span class="min-w-0 flex-1">{label}</span>
	<span class="flex w-32 shrink-0 items-center gap-2 pl-2">
		<StateMenu
			name={label}
			active={detail?.state ?? null}
			options={agreementStateOptions()}
			onSelect={onChange}
		/>
		{#if detail}
			<span class="text-base-content/60" title={source}>
				<i aria-hidden="true" class="ph-duotone {manual ? 'ph-hand-pointing' : 'ph-scan'}"></i>
				<span class="sr-only">{source}</span>
			</span>
		{/if}
	</span>
</li>
