export const authHeaderState = $state<{ faIcon: string; label: string }>({
	faIcon: '',
	label: ''
});

export function setAuthHeader(newValue: typeof authHeaderState) {
	authHeaderState.faIcon = newValue.faIcon;
	authHeaderState.label = newValue.label;
}
