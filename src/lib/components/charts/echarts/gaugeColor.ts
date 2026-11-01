/** A gauge's color by how far its value is between min and max: red, amber, then green. */
export function gaugeColor({
	value,
	min,
	max
}: {
	value: number;
	min: number;
	max: number;
}): string {
	// Guard against division by zero
	const range = max - min;
	const percentage = range === 0 ? 100 : ((value - min) / range) * 100;
	if (percentage < 33) return '#ef4444'; // red
	if (percentage < 66) return '#f59e0b'; // amber
	return '#10b981'; // green
}
