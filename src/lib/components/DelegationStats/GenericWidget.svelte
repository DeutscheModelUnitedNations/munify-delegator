<script lang="ts">
	import Wrapper from './Wrapper.svelte';

	interface Props {
		content: { icon: string; title: string; value?: string | number; desc: string }[];
	}

	let { content }: Props = $props();
</script>

<Wrapper>
	{#each content as stat}
		<div class="stat">
			<div class="stat-figure text-secondary">
				<i class="fa-duotone text-3xl fa-{stat.icon}"></i>
			</div>
			<div class="stat-title">{stat.title}</div>
			<div class="stat-value">
				{#if stat.value}
					{stat.value}
				{:else}
					<span class="loading loading-dots loading-md"></span>
				{/if}
			</div>
			<div class="stat-desc">{stat.desc}</div>
		</div>
	{/each}
</Wrapper>
