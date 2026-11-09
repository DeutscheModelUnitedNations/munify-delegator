<script lang="ts">
	import { m } from '#lib/paraglide/messages';
</script>

<!-- The medal says "head delegate" on hover only; the hidden text says it to a screen reader -->
<div class="tooltip" data-tip={m.headDelegate()}>
	<i class="fa-sharp-duotone fa-solid fa-medal ml-2"></i>
	<span class="sr-only">{m.headDelegate()}</span>
</div>
