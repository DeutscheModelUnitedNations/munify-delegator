/**
 * In-app replacements for the browser's `confirm()` and `prompt()`. Both are promises, so a call
 * site reads like the native call: `if (!(await confirmDialog({ text }))) return;`. The
 * `DialogHost` in the root layout renders whichever one is open.
 */

type DialogRequest =
	| {
			kind: 'confirm';
			title?: string;
			text: string;
			confirmLabel?: string;
			/** Paints the confirm button red, for deletions and other things that cannot be undone */
			danger: boolean;
			resolve: (value: boolean) => void;
	  }
	| {
			kind: 'prompt';
			title?: string;
			text: string;
			initialValue: string;
			confirmLabel?: string;
			resolve: (value: string | null) => void;
	  };

function createDialogState() {
	let current = $state<DialogRequest>();

	function dismiss() {
		const request = current;
		current = undefined;
		if (request?.kind === 'confirm') request.resolve(false);
		else request?.resolve(null);
	}

	return {
		get current() {
			return current;
		},
		set current(value: DialogRequest | undefined) {
			current = value;
		},
		/** A dialog opened over another one dismisses the first as cancelled. */
		open(request: DialogRequest) {
			dismiss();
			current = request;
		},
		dismiss
	};
}

export const dialogs = createDialogState();

export function confirmDialog(options: {
	text: string;
	title?: string;
	confirmLabel?: string;
	danger?: boolean;
}): Promise<boolean> {
	return new Promise((resolve) => {
		dialogs.open({ kind: 'confirm', danger: false, ...options, resolve });
	});
}

/** Resolves to the entered text, or `null` when the dialog was cancelled. */
export function promptDialog(options: {
	text: string;
	title?: string;
	initialValue?: string;
	confirmLabel?: string;
}): Promise<string | null> {
	return new Promise((resolve) => {
		dialogs.open({ kind: 'prompt', initialValue: '', ...options, resolve });
	});
}
