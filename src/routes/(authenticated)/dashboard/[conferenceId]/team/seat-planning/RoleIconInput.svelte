<script lang="ts">
	import Flag from '#lib/components/Flag.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import RoleInput from './RoleInput.svelte';

	interface Props {
		value?: string;
		class?: string;
		placeholder?: string;
		onchange?: (e: Event & { currentTarget: HTMLInputElement }) => void;
	}

	let { value = $bindable(''), class: className, placeholder, onchange }: Props = $props();
</script>

<div class="flex items-center gap-2">
	<Flag nsa icon={value || null} size="xs" />
	<RoleInput class={className} label={m.seatPlanningIcon()} {placeholder} {onchange} bind:value />
</div>
