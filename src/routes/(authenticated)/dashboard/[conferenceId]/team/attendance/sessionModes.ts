import { m } from '#lib/paraglide/messages.js';
import type { ServerMode } from './attendanceSession';

/**
 * What the page can be working in: a session, or INFO, which is the check without any record and
 * without any session. It lives in memory on this device and never reaches the server.
 */
export type SessionMode = ServerMode | 'INFO';

export const modeIcons: Record<SessionMode, string> = {
	CHECK: 'fa-user-check',
	RECORD: 'fa-bolt',
	BADGE: 'fa-id-card',
	INFO: 'fa-circle-info'
};

export const modeLabels: Record<SessionMode, () => string> = {
	CHECK: m.scanModeCheck,
	RECORD: m.scanModeRecord,
	BADGE: m.scanBadgeOption,
	INFO: m.scanModeInfo
};
