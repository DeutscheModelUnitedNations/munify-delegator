<script lang="ts">
	import { env } from '$env/dynamic/public';
	import * as m from '$lib/paraglide/messages.js';

	let { logoutUrl }: { logoutUrl: string } = $props();
</script>

<ul tabindex="-1" class="menu dropdown-content mt-3 w-52 rounded-box bg-base-100 p-2 shadow-2xl">
	<li>
		<a href="/my-account">
			<i class="fa-duotone fa-user w-4"></i>
			{m.profileSettings()}
		</a>
	</li>
	<li>
		<a href={logoutUrl}>
			<i class="fa-duotone fa-sign-out w-4"></i>
			{m.logout()}
		</a>
	</li>
	<li>
		<a href={env.PUBLIC_FEEDBACK_URL} target="_blank">
			<i class="fa-duotone fa-comment w-4"></i>
			{m.feedback()}
		</a>
	</li>
</ul>
