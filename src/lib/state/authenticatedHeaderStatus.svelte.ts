export const headerState = $state<{
	openNavCallback: (() => void) | undefined;
	/**
	 * A conference's side navigation is on screen, whose head names the conference and switches
	 * it, so the breadcrumbs leave their conference crumb to phones (where the menu is a drawer).
	 * Written by the conference's shell in the browser only.
	 */
	conferenceMenu: boolean;
}>({
	openNavCallback: undefined,
	conferenceMenu: false
});

export function setHeaderStatus(newValue: Partial<typeof headerState>) {
	if (newValue.openNavCallback) {
		headerState.openNavCallback = newValue.openNavCallback;
	}
}
