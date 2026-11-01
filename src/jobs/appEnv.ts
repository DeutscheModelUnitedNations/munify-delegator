import { variables } from '../env';

/**
 * One of the app's variables (`src/env.ts`), read from `process.env` and validated by its schema,
 * as SvelteKit would. The jobs bundle answers `$app/env/private` and `$app/env/public` with a
 * module of these reads (`tsdown.jobs.config.ts`), so app code a job calls reads its configuration
 * the same way it does in the app.
 */
export function readAppVariable(name: keyof typeof variables): unknown {
	const result = variables[name].schema['~standard'].validate(process.env[name]);
	if (result instanceof Promise) throw new Error(`${name} has an asynchronous schema`);
	if (result.issues) {
		const problems = result.issues.map((issue) => issue.message).join('; ');
		throw new Error(`Invalid environment variable ${name}: ${problems}`);
	}
	return result.value;
}
