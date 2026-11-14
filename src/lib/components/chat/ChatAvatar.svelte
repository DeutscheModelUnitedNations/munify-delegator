<!--
	@component
	The round picture of a chat or contact: a nation's flag, or an icon for everything else (a
	non-state actor, a role, a team inbox, a delegation's group).
-->
<script lang="ts">
	interface Props {
		avatar: { alpha2Code: string } | { icon: string };
		size?: 'sm' | 'md';
	}

	let { avatar, size = 'md' }: Props = $props();
</script>

<span
	class={[
		'bg-base-300 text-base-content/70 ring-base-300 flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-1',
		size === 'sm' ? 'size-8 text-base' : 'size-10 text-xl'
	]}
>
	{#if 'alpha2Code' in avatar}
		<span class="fi fis fi-{avatar.alpha2Code} !h-full !w-full !bg-cover"></span>
	{:else}
		<i aria-hidden="true" class="ph-duotone ph-{avatar.icon.replace(/^ph-/, '')}"></i>
	{/if}
</span>
