<script lang="ts">
import { getLoggedInUser, redirectLogin } from "$lib/auth/oidc";

const loggedInUser = getLoggedInUser();

if (!loggedInUser) {
	redirectLogin();
}
</script>

<slot />
