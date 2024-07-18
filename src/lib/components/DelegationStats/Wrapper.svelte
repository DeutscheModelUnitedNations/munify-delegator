<script lang="ts">
	import type { Snippet } from "svelte";

  interface Props {
    className?: string;
    children: Snippet;
  }

  let { className, children }: Props = $props();
</script>

<div class="stats stats-vertical sm:stats-horizontal shadow { className }">
  {@render children()}
</div>