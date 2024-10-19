export const headerState = $state<{
	faIcon: string;
	label: string;
	openNavCallback: (() => void) | undefined;
}>({
	faIcon: '',
	label: '',
	openNavCallback: undefined
});

export function setHeaderStatus(newValue: Partial<typeof headerState>) {
	if (newValue.faIcon) {
		headerState.faIcon = newValue.faIcon;
	}
	if (newValue.label) {
		headerState.label = newValue.label;
	}
	if (newValue.openNavCallback) {
		headerState.openNavCallback = newValue.openNavCallback;
	}
}
