export const headerState = $state<{
	openNavCallback: (() => void) | undefined;
}>({
	openNavCallback: undefined
});

export function setHeaderStatus(newValue: Partial<typeof headerState>) {
	if (newValue.openNavCallback) {
		headerState.openNavCallback = newValue.openNavCallback;
	}
}
