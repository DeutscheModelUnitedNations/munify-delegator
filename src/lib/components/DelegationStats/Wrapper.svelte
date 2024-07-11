<script lang="ts">
  interface Props {
    className?: string;
  }

  let { className }: Props = $props();
</script>

<div class="stats stats-vertical sm:stats-horizontal shadow { className }">
  <slot />
</div>