import type { FieldState } from '#lib/paperScan/readPaper';

const STATES: readonly FieldState[] = ['yes', 'no', 'unclear'];

/** The state a select's option stands for; `null` for the one saying nothing is recorded. */
export const agreementStateOf = (value: string): FieldState | null =>
	STATES.find((state) => state === value) ?? null;

/** The option of a state; the empty one for none. */
export const selectedState = (state: FieldState | undefined) => state ?? '';
