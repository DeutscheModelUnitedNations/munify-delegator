<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { languageTag } from '$lib/paraglide/runtime';
	import { type PageData } from './$houdini';

	let { data }: { data: PageData } = $props();
	let { ConferenceQuery } = $state(data);
</script>

<!-- {m.RegistrationNotPossible()}
{languageTag()} -->

{$ConferenceQuery.data?.findManyConferences.map((x) => x.title).join(', ')}
