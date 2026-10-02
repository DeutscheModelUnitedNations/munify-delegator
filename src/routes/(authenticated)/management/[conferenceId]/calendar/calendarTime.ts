/** The UTC wall-clock time of an entry, as an `HH:mm` string for a time input. */
export function toTimeString(d: Date): string {
	const pad = (n: number) => n.toString().padStart(2, '0');
	return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** A day's date with an `HH:mm` time set on it, in UTC. */
export function combineDateTime(dayDate: Date, timeStr: string): Date {
	const d = new Date(dayDate);
	const [h, min] = timeStr.split(':').map(Number);
	d.setUTCHours(h, min, 0, 0);
	return d;
}

/** The same wall-clock time as `time`, on the date of `dayDate`. */
export function moveToDay(time: Date | string, dayDate: Date | string): Date {
	const source = new Date(time);
	const moved = new Date(dayDate);
	moved.setUTCHours(source.getUTCHours(), source.getUTCMinutes(), 0, 0);
	return moved;
}
