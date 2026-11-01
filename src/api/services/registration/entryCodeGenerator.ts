import { customAlphabet } from 'nanoid';
import { ENTRY_CODE_ALPHABET, ENTRY_CODE_LENGTH } from '#lib/helpers/entryCode';

/** A new delegation entry code or supervisor connection code; see `#lib/helpers/entryCode`. */
export const makeEntryCode = customAlphabet(ENTRY_CODE_ALPHABET, ENTRY_CODE_LENGTH);
