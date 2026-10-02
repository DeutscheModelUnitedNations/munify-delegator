import { customAlphabet } from 'nanoid';

export const entryCodeLength = 6;
// https://github.com/CyberAP/nanoid-dictionary
export const entryCodeAlphabet = '6789BCDFGHJKLMNPQRTW';
export const makeEntryCode = customAlphabet(entryCodeAlphabet, entryCodeLength);
