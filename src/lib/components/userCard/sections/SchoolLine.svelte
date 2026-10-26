<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Modal from '#lib/components/Modal.svelte';
	import SchoolChangeForm from '#lib/components/form/SchoolChangeForm.svelte';
	import InfoRow from './InfoRow.svelte';

	/** A registration's school as a list row, with the button that changes it. */
	interface Props {
		school: { id: string; name: string; city?: string | null } | null | undefined;
		label?: string;
		hint?: string;
		save: (choice: { schoolId?: string | null; schoolName?: string | null }) => Promise<unknown>;
	}

	let { school, label = m.schoolOrInstitution(), hint, save }: Props = $props();

	let changing = $state(false);
</script>

<InfoRow title={label} faIcon="school" {hint}>
	{#if school}
		<span class="text-sm">
			{school.name}
			{#if school.city}
				<span class="text-base-content/60">· {school.city}</span>
			{/if}
		</span>
	{:else}
		<span class="text-base-content/60 text-sm">{m.noSchoolGiven()}</span>
	{/if}
	{#snippet actions()}
		<button class="btn btn-sm" onclick={() => (changing = true)} aria-label={m.a11yEditSchool()}>
			<i class="fa-sharp-duotone fa-solid fa-pencil"></i>
			{m.changeSchool()}
		</button>
	{/snippet}
</InfoRow>

<Modal bind:open={changing} title={m.changeSchool()}>
	<SchoolChangeForm current={school} {label} {save} onSaved={() => (changing = false)} />
</Modal>
