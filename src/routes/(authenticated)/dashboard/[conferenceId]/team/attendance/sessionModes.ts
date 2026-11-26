import { m } from '#lib/paraglide/messages';
import type { ServerMode } from './attendanceSession';

/**
 * What the page can be working in: a session, or INFO, which is the check without any record and
 * without any session. It lives in memory on this device and never reaches the server.
 */
export type SessionMode = ServerMode | 'INFO';

export const modeIcons: Record<SessionMode, string> = {
	CHECK: 'ph-user-check',
	RECORD: 'ph-lightning',
	BADGE: 'ph-identification-card',
	INFO: 'ph-info'
};

export const modeLabels: Record<SessionMode, () => string> = {
	CHECK: m.scanModeCheck,
	RECORD: m.scanModeRecord,
	BADGE: m.scanModeBadge,
	INFO: m.scanModeInfo
};

/** What a scan does in each kind of session that can be started. */
export const modeHints: Record<ServerMode, () => string> = {
	CHECK: m.scanModeCheckHint,
	RECORD: m.scanModeRecordHint,
	BADGE: m.scanModeBadgeHint
};
