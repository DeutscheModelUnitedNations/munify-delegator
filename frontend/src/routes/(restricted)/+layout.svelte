<script lang="ts">
  // TODO Hier ist Platz, da könnte ihr OIDC-Client-Code stehen!

// 	import { onMount } from "svelte";
//   import { UserManager } from "oidc-client-ts";

//   onMount(() => {
//     const mgr = new UserManager({
//       authority: `https://${import.meta.env.VITE_AUTH_DOMAIN}`,
//       client_id: import.meta.env.VITE_AUTH_CLIENT_ID,
//       redirect_uri: `http://${import.meta.env.VITE_FRONTEND_URL}/auth/login-callback`,
//       response_type: "code",
//       scope: "openid profile email",
//       post_logout_redirect_uri: `http://${import.meta.env.VITE_FRONTEND_URL}/auth/logout-callback`,
//       automaticSilentRenew: true,
//     });
//     const customState = { website: window.location.pathname };
//     mgr.signinRedirect({ state: customState });
//   });
// </script>

<slot />