import { customAlphabet } from 'nanoid';

export const entryCodeLength = 6;
// https://github.com/CyberAP/nanoid-dictionary
export const makeDelegationEntryCode = customAlphabet('6789BCDFGHJKLMNPQRTW', entryCodeLength);
