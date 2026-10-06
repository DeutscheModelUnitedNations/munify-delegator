import { browser } from '$app/environment';

const themePreferences = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof themePreferences)[number];

// keep in sync with the inline script in src/app.html, which applies the theme before the first paint
const STORAGE_KEY = 'theme';

const isThemePreference = (value: unknown): value is ThemePreference =>
	themePreferences.some((preference) => preference === value);

/**
 * Light/dark mode chosen by the user. Resolves to the `data-theme` attribute on `<html>`, which
 * selects the daisyUI theme and drives Tailwind's `dark:` variant (see app.css).
 */
class ThemeStore {
	preference = $state<ThemePreference>('system');
	#systemDark = $state(false);

	isDark = $derived(
		this.preference === 'dark' || (this.preference === 'system' && this.#systemDark)
	);

	constructor() {
		if (!browser) return;

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (isThemePreference(stored)) this.preference = stored;
		} catch {
			// unavailable storage: follow the system
		}

		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		this.#systemDark = mediaQuery.matches;
		mediaQuery.addEventListener('change', (event) => {
			this.#systemDark = event.matches;
			this.#apply();
		});
		this.#apply();
	}

	set(preference: ThemePreference) {
		this.preference = preference;
		try {
			if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
			else localStorage.setItem(STORAGE_KEY, preference);
		} catch {
			// the choice still applies for this visit
		}
		this.#apply();
	}

	#apply() {
		document.documentElement.setAttribute('data-theme', this.isDark ? 'dark' : 'light');
	}
}

export const theme = new ThemeStore();
