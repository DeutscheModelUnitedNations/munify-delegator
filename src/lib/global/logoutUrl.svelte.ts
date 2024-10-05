let logoutUrl = $state<string | undefined>(undefined);

export function getLogoutUrl() {
	if (logoutUrl === undefined) {
		throw new Error('Logout URL not set');
	}
	return logoutUrl;
}

export function setLogoutUrl(url: string) {
	logoutUrl = url;
}
