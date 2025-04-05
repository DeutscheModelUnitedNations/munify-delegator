import forge from 'node-forge';
import { subtle } from 'node:crypto';

// https://gitlab.com/soapbox-pub/seeded-rsa/-/blob/main/mod.ts?ref_type=heads

/** Get SHA-256 hex digest from a string. */
function getDigest(message: string) {
	if (!message) {
		return '';
	}
	const hash = forge.md.sha256.create();
	hash.update(message);
	return hash.digest().toHex();
}

/**
 * Convert a string into an ArrayBuffer.
 * <https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String>
 */
function str2ab(str: string): ArrayBuffer {
	const buf = new ArrayBuffer(str.length);
	const bufView = new Uint8Array(buf);
	for (let i = 0, strLen = str.length; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return buf;
}

interface GenerateSeededRsaOptions {
	bits?: number;
}

/** Generate a deterministic RSA keypair from a seed. */
export async function generateSeededRsa(
	seed: string,
	opts: GenerateSeededRsaOptions = {}
): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
	// Seed the PRNG with a SHA-256 digest from the string.
	const prng = forge.random.createInstance();
	prng.seedFileSync = () => getDigest(seed);

	const keys = forge.pki.rsa.generateKeyPair({ ...opts, prng });

	const rsaPublicKey = forge.pki.publicKeyToAsn1(keys.publicKey);
	const publicKeyData = str2ab(forge.asn1.toDer(rsaPublicKey).getBytes());

	const rsaPrivateKey = forge.pki.privateKeyToAsn1(keys.privateKey);
	const privateKeyInfo = forge.pki.wrapRsaPrivateKey(rsaPrivateKey);
	const privateKeyData = str2ab(forge.asn1.toDer(privateKeyInfo).getBytes());

	const algorithm = {
		name: 'RSASSA-PKCS1-v1_5',
		hash: 'SHA-256'
	};

	const publicKey = await subtle.importKey('spki', publicKeyData, algorithm, true, ['verify']);

	const privateKey = await subtle.importKey('pkcs8', privateKeyData, algorithm, true, ['sign']);

	return {
		publicKey,
		privateKey
	};
}
