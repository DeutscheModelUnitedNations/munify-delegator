<script lang="ts">
import { getLoggedInUser, redirectLogin } from "$lib/auth/oidc";

let { children } = $props();

const loggedInUser = getLoggedInUser();

if (!loggedInUser) {
	redirectLogin();
}
</script>

{@render children()}
