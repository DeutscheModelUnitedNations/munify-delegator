import { CERTIFICATE_SECRET } from '$app/env/private';
import { createCodeSigner } from './codeSigner';

/** The deployment's signer of codes (`createCodeSigner`), keyed by `CERTIFICATE_SECRET`. */
export const { signCode, signedCodeKeys } = createCodeSigner(() => CERTIFICATE_SECRET);
