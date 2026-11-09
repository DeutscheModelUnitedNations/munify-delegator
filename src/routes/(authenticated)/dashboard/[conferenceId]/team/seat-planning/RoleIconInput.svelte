<script lang="ts">
	import IconPicker from '#lib/components/IconPicker.svelte';
	import { m } from '#lib/paraglide/messages';
	import RoleInput from './RoleInput.svelte';

	interface Props {
		value?: string;
		class?: string;
		placeholder?: string;
		onchange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
	}

	let { value = $bindable(''), class: className, placeholder, onchange }: Props = $props();
	let input = $state<HTMLInputElement>();

	/** A picked icon goes through the input, so saving it works like typing the name. */
	function pick(icon: string) {
		if (!input) return;
		input.value = icon;
		value = icon;
		input.dispatchEvent(new Event('change'));
	}
</script>

<div class="flex items-center gap-2">
	<IconPicker
		value={value || null}
		fallback="hand-pointing"
		triggerClass="btn btn-ghost btn-sm btn-square shrink-0"
		onchange={pick}
	/>
	<RoleInput
		class={className}
		label={m.seatPlanningIcon()}
		{placeholder}
		{onchange}
		bind:value
		bind:ref={input}
	/>
</div>
