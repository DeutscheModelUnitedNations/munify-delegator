<script lang="ts">
	interface Props {
		small?: boolean;
	}

	let { small = false }: Props = $props();
</script>

<ul class="menu px-0">
	<slot />
</ul>
