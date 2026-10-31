import { customAlphabet } from 'nanoid';

// https://github.com/CyberAP/nanoid-dictionary?tab=readme-ov-file#nolookalikessafe
const NANOID_ALPHABET = '6789BCDFGHJKLMNPQRTWbcdfghjkmnpqrtwz';
const NANOID_LENGTH = 30;
export const nanoid = customAlphabet(NANOID_ALPHABET, NANOID_LENGTH);
