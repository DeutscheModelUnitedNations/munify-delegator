<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { languageTag } from '$lib/paraglide/runtime';
	import { type PageData } from './$houdini';

	let { data }: { data: PageData } = $props();
</script>

{m.RegistrationNotPossible()}
{languageTag()}