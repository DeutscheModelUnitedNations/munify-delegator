import { readFileSync } from 'node:fs';
import PostalMime from 'postal-mime';
import { SMTPServer, type SMTPServerDataStream, type SMTPServerOptions } from 'smtp-server';
import {
	SCANNER_SMTP_HOST,
	SCANNER_SMTP_PORT,
	SCANNER_SMTP_TLS,
	SCANNER_SMTP_TLS_CERT,
	SCANNER_SMTP_TLS_KEY
} from '$app/env/private';
import { findDeliverer, type Deliverer } from '#api/handlers/scannerAccess/scannerAccessService';
import { mayDeliver } from '#api/handlers/scannerAccess/scannerAccessPermissions';
import { closeOnShutdown } from '#api/services/shutdown';
import { logger } from '#lib/logger';
import { MAX_POSTAL_SCAN_SIZE } from '#lib/paperScan/limits';
import { scanFileType } from '#lib/paperScan/intake/scanFile';
import type { ScanFile } from '#lib/paperScan/intake/takeScan';
import { IntakeBusyError } from './intakeGate';
import { ingestScans, NotAllowedToDeliverError } from './scanIngest';

/**
 * The mailbox scanners send to: what office devices call "scan to email" logs in to an SMTP server
 * and sends the pages as attachments. This is that server, and nothing more: it takes mail only from
 * a scanner login (`scannerAccess`), from and to whatever address the device was given, and passes
 * none on. On only with `SCANNER_SMTP_PORT`.
 */

/** Attachments grow by a third in an email; the rest is room for its text. */
const MAX_EMAIL_SIZE = Math.ceil(MAX_POSTAL_SCAN_SIZE * 1.4) + 1_000_000;
/** How often a renewed certificate is picked up. */
const CERTIFICATE_CHECK_MS = 12 * 60 * 60_000;
const MAX_CLIENTS = 50;
const DISABLED_COMMANDS = ['XCLIENT', 'XFORWARD'];
/** How long a scanner has to send an email once it is its turn, so a stalled one keeps no place. */
const SEND_MS = 3 * 60_000;

/** An answer in SMTP's own codes. */
function smtpError({ code, message }: { code: number; message: string }) {
	return Object.assign(new Error(message), { responseCode: code });
}

/** The email's bytes; refused (552) once it is larger than taken, (421) when it does not come. */
async function emailOf(stream: SMTPServerDataStream) {
	const timer = setTimeout(
		() => stream.destroy(smtpError({ code: 421, message: 'Took too long' })),
		SEND_MS
	);
	const chunks: Buffer[] = [];
	let size = 0;
	try {
		for await (const chunk of stream) {
			const bytes = Buffer.from(chunk);
			size += bytes.length;
			// what comes after is read all the same, as the protocol wants, and dropped
			if (size <= MAX_EMAIL_SIZE) chunks.push(bytes);
		}
	} finally {
		clearTimeout(timer);
	}
	if (size > MAX_EMAIL_SIZE) throw smtpError({ code: 552, message: 'The scan is too large' });
	return Buffer.concat(chunks);
}

/**
 * The scans attached to an email. What is no scan by its type or its bytes (a logo in the device's
 * signature, a text) is left out; an attachment nobody can read is kept, so its owner is told.
 */
export async function scansOfEmail(email: Uint8Array): Promise<ScanFile[]> {
	const { attachments } = await PostalMime.parse(email, { attachmentEncoding: 'arraybuffer' });
	return attachments.flatMap(({ filename, mimeType, content, related }) => {
		if (related || typeof content === 'string') return [];
		const bytes = new Uint8Array(new Uint8Array(content));
		const attached = /^(application|image)\//.test(mimeType);
		if (!attached && !scanFileType(bytes)) return [];
		return [{ name: filename ?? 'scan', bytes }];
	});
}

export function tlsOptions(): SMTPServerOptions {
	if (SCANNER_SMTP_TLS === 'proxy') {
		// TLS ends in front of the app: what arrives here is plain. STARTTLS is off, not only hidden: it
		// would use the library's own certificate, whose key everybody has.
		return {
			secure: false,
			allowInsecureAuth: true,
			disabledCommands: [...DISABLED_COMMANDS, 'STARTTLS']
		};
	}
	if (!SCANNER_SMTP_TLS_CERT || !SCANNER_SMTP_TLS_KEY) {
		throw new Error('SCANNER_SMTP_TLS_CERT and SCANNER_SMTP_TLS_KEY are not set');
	}
	return {
		secure: SCANNER_SMTP_TLS === 'implicit',
		cert: readFileSync(SCANNER_SMTP_TLS_CERT),
		key: readFileSync(SCANNER_SMTP_TLS_KEY)
	};
}

/** What the scanner is answered when its email was not taken in. */
function answerTo(error: unknown) {
	if (error instanceof IntakeBusyError) {
		return smtpError({ code: 452, message: 'Busy, try again later' });
	}
	if (error instanceof NotAllowedToDeliverError) {
		return smtpError({ code: 535, message: 'This login may not deliver scans' });
	}
	if (error instanceof Error && 'responseCode' in error) return error;
	logger.error('Taking in an emailed scan failed', error);
	return smtpError({ code: 451, message: 'Failed, try again later' });
}

/** The login a scanner signs in with, while it may deliver. */
async function signIn(login: { username: string; password: string }) {
	const deliverer = await findDeliverer(login);
	return deliverer && (await mayDeliver(deliverer)) ? deliverer : undefined;
}

export function createSmtpReceiver(options: SMTPServerOptions) {
	/** Who is signed in, by session; the library's `user` takes text only. */
	const signedIn = new Map<string, Deliverer>();

	const server = new SMTPServer({
		name: SCANNER_SMTP_HOST,
		banner: 'DELEGATOR scans',
		authMethods: ['PLAIN', 'LOGIN'],
		size: MAX_EMAIL_SIZE,
		maxClients: MAX_CLIENTS,
		// scanners are on networks without reverse DNS, which would only be waited for
		disableReverseLookup: true,
		disabledCommands: DISABLED_COMMANDS,
		// a long stack is read before it is answered
		socketTimeout: 10 * 60_000,
		...options,
		onAuth({ username, password }, session, callback) {
			signIn({ username: username ?? '', password: password ?? '' }).then(
				(deliverer) => {
					if (!deliverer) {
						callback(smtpError({ code: 535, message: 'Wrong username or password' }));
						return;
					}
					signedIn.set(session.id, deliverer);
					callback(null, { user: deliverer.accessId });
				},
				(error: unknown) => {
					logger.error('Signing a scanner in failed', error);
					callback(smtpError({ code: 454, message: 'Failed, try again later' }));
				}
			);
		},
		onData(stream, session, callback) {
			const deliverer = signedIn.get(session.id);
			if (!deliverer) {
				stream.resume();
				callback(smtpError({ code: 530, message: 'Sign in first' }));
				return;
			}
			// read only once it is its turn: until then it stays with the scanner
			ingestScans({
				deliverer,
				receive: async () => scansOfEmail(await emailOf(stream)),
				source: 'EMAIL'
			}).then(
				() => callback(null),
				(error: unknown) => {
					// the rest of an email not read is let through and dropped, as the protocol wants
					stream.resume();
					callback(answerTo(error));
				}
			);
		},
		onClose(session) {
			signedIn.delete(session.id);
		}
	});
	// a device that hangs up or speaks no TLS we do: theirs to fix, nothing to look into here
	server.on('error', (error) => logger.warn('SMTP receiver', error));
	return server;
}

let started = false;

/** Starts the receiver, once, where the instance has one. */
export function startSmtpReceiver() {
	if (!SCANNER_SMTP_PORT || started) return;
	started = true;
	const server = createSmtpReceiver(tlsOptions());
	server.listen(SCANNER_SMTP_PORT, () =>
		logger.info('Taking in scans by email', { port: SCANNER_SMTP_PORT })
	);
	const renewal = setInterval(() => {
		try {
			server.updateSecureContext(tlsOptions());
		} catch (error) {
			logger.error('Reading the SMTP certificate failed', error);
		}
	}, CERTIFICATE_CHECK_MS);
	renewal.unref();
	closeOnShutdown(() => new Promise<void>((closed) => server.close(closed)));
}
