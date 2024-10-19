export const authHeaderState = $state<{
	faIcon: string;
	label: string;
	openNavCallback: (() => void) | undefined;
}>({
	faIcon: '',
	label: '',
	openNavCallback: undefined
});

export function setAuthHeader(newValue: Partial<typeof authHeaderState>) {
	if (newValue.faIcon) {
		authHeaderState.faIcon = newValue.faIcon;
	}
	if (newValue.label) {
		authHeaderState.label = newValue.label;
	}
	if (newValue.openNavCallback) {
		authHeaderState.openNavCallback = newValue.openNavCallback;
	}
}
