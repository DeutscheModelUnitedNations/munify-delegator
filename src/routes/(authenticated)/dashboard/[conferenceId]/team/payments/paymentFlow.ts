import type { AdministrativestatusEnum } from '$lib/api/rumbleClient/client';

interface LoadedTransaction {
	id: string;
	recievedAt?: Date | string | null;
}

/** Whether the result can be shown: the transaction searched for has loaded and nothing is pending. */
export function transactionReadyFor(
	searchValue: string | null | undefined,
	transactionId: string | undefined,
	fetching: boolean
): boolean {
	return Boolean(searchValue) && transactionId === searchValue && !fetching;
}

/** Whether the "received" hotkey may act: a not yet received transaction is open and idle. */
export function canMarkReceived(
	searchValue: string | null | undefined,
	transaction: LoadedTransaction | undefined,
	busy: boolean
): boolean {
	return Boolean(searchValue && transaction && !transaction.recievedAt && !busy);
}

type StatusUpdate =
	| { error: string }
	| {
			args: {
				id: string;
				assignedStatus: AdministrativestatusEnum;
				recievedAt: Date | undefined;
			};
	  };

/**
 * The update that sets a transaction's status. Marking it done needs the date it was received;
 * `recieveDate` is a `YYYY-MM-DD` input value.
 */
export function transactionStatusUpdate(
	transactionId: string | undefined,
	status: AdministrativestatusEnum,
	recieveDate: string
): StatusUpdate {
	if (!transactionId) return { error: 'No transaction id' };
	if (status === 'DONE' && !recieveDate) return { error: 'No date selected' };
	return {
		args: {
			id: transactionId,
			assignedStatus: status,
			recievedAt: recieveDate ? new Date(recieveDate) : undefined
		}
	};
}
