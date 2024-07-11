import { publicConfig } from "../../config/public";
import { type User, UserManager } from "oidc-client-ts";
import { page } from "$app/stores";
import { get } from "svelte/store";
import { goto } from "$app/navigation";

const userManager = new UserManager({
	authority: publicConfig.OIDC.AUTHORITY,
	client_id: publicConfig.OIDC.CLIENT_ID,
	redirect_uri: `${publicConfig.HOSTNAME}/auth/login-callback`,
	post_logout_redirect_uri: `${publicConfig.HOSTNAME}/auth/logout-callback`,
	automaticSilentRenew: true,
});

let user: User | undefined = undefined;

export function getLoggedInUser() {
	return user;
}

type UrlState = {
	visitedUrl: string;
};

export function redirectLogin() {
	const urlState: UrlState = {
		visitedUrl: get(page).url.toString(),
	};
	const urlEncoded = encodeURIComponent(JSON.stringify(urlState));
	
	userManager.signIn
	// signinRedirect({ url_state: urlEncoded,  });
}

export async function resolveLogin(url?: string) {
	const usr = await userManager.signinCallback(url ?? get(page).url.toString());
	if (usr) {
		user = usr;
		if (usr.state) {
			const state: UrlState = JSON.parse(
				decodeURIComponent(usr.state as string),
			);
			goto(state.visitedUrl);
		}
		return { user: usr };
	}
}

export function redirectLogout() {
	// userManager.signoutRedirect();
}
