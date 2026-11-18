import { client } from '#lib/api/rumbleClient/client';

/**
 * `read()` once it stops changing for `delay` ms, so a preview follows the text once typing
 * pauses, not on every key. Call while a component initializes: it runs an effect.
 */
export function debounced<T>({
	read,
	initial,
	delay = 400
}: {
	read: () => T;
	initial: T;
	delay?: number;
}) {
	let current = $state(initial);
	$effect(() => {
		const next = read();
		const timer = setTimeout(() => (current = next), delay);
		return () => clearTimeout(timer);
	});
	return {
		get current() {
			return current;
		}
	};
}

type PreviewArgs = Parameters<typeof client.query.emailPreview>[0]['__args'];

/** A mail as it would go out; undefined while the draft cannot be rendered. */
export const fetchEmailPreview = (args: PreviewArgs) =>
	Promise.resolve(client.query.emailPreview({ __args: args, subject: true, html: true })).catch(
		() => undefined
	);
