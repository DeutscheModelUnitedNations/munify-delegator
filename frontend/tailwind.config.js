/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

export default {
	content: ['./src/**/*.{html,js,svelte,ts}', './lib/**/*.{html,js,svelte,ts}'],
	theme: {
		fontFamily: {
			sans: ['Outfit', 'system-ui', 'sans-serif'],
			serif: ['Vollkorn', 'ui-serif', 'Georgia', 'serif'],
			mono: ['Roboto Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
			fa: ['FontAwesome']
		},
		extend: {}
	},
	daisyui: {
		themes: [
			{
				light: {
					primary: '#3d7dd2',
					'primary-content': '#ffffff',
					secondary: '#00b5b4',
					accent: '#ff301c',
					neutral: '#0f1023',
					'base-100': '#fff',
					'base-200': '#f6f7fb',
					'base-300': '#fafbfc',
					info: '#98d7f0',
					success: '#9cdcc5',
					warning: '#e0ca96',
					error: '#f8bbb0'
				}
			},
			{
				dark: {
					primary: '#3d7dd2',
					'primary-content': '#ffffff',
					secondary: '#00b5b4',
					accent: '#ff301c',
					neutral: '#4e5168',
					'base-100': '#393b51',
					'base-200': '#2b2d43',
					'base-300': '#0f1023',
					info: '#98d7f0',
					success: '#9cdcc5',
					warning: '#e0ca96',
					error: '#f8bbb0'
				}
			}
		]
	},
	plugins: [
		require('daisyui'),
		plugin(function ({ addUtilities }) {
			const newUtilities = {
				'.max-ch-sm': {
					'max-width': '50ch'
				},
				'.max-ch-md': {
					'max-width': '75ch'
				},
				'.max-ch-lg': {
					'max-width': '100ch'
				}
			};

			addUtilities(newUtilities, ['responsive']);
		})
	]
};
