<script lang="ts">
	import { page } from '$app/stores';
	$: conferenceId = $page.params.conferenceId;
</script>

<h1>Messaging</h1>
<nav>
	<a href="./compose">Compose</a> |
	<a href="./history">Sent Messages</a>
</nav>

<slot />
