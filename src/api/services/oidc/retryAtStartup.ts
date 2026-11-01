/** How often start-up asks again, and how long it waits in between, before it gives up. */
const ATTEMPTS = 10;
const DELAY_MS = 1000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Runs `attempt` until it succeeds, `attempts` times at most, waiting `delayMs` in between, and
 * throws the last error after that. For what the app needs before it can serve anything, such as
 * the provider's discovery document: a provider that is a moment late (restarting, or oidc-mock
 * still creating its signing key, which it answers 503 for) would otherwise stop the app.
 */
export async function retryAtStartup<T>({
	attempt,
	onRetry,
	attempts = ATTEMPTS,
	delayMs = DELAY_MS,
	sleep = wait
}: {
	attempt: () => Promise<T>;
	onRetry?: (failure: { error: unknown; attemptsLeft: number }) => void;
	attempts?: number;
	delayMs?: number;
	sleep?: (ms: number) => Promise<void>;
}): Promise<T> {
	for (let made = 1; ; made++) {
		try {
			return await attempt();
		} catch (error) {
			if (made >= attempts) throw error;
			onRetry?.({ error, attemptsLeft: attempts - made });
			await sleep(delayMs);
		}
	}
}
