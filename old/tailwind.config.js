/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

export default {
	content: ['./src/**/*.{html,js,svelte,ts}', './lib/**/*.{html,js,svelte,ts}'],
	safelist: ['table-xs', 'table-sm', 'table-md', 'table-lg', 'table-zebra'],
	theme: {
		fontFamily: {
			sans: ['Outfit', 'system-ui', 'sans-serif'],
			serif: ['Vollkorn', 'ui-serif', 'Georgia', 'serif'],
			mono: ['Roboto Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
			fa: ['FontAwesome']
		},
		colors: {
			primary: {
				50: '#F7FBFD',
				100: '#E3F0F8',
				200: '#B9D7EF',
				300: '#90BCE5',
				400: '#669EDC',
				500: '#3D7DD2',
				600: '#295FB3',
				700: '#204489',
				800: '#162D60',
				900: '#0D1836',
				950: '#080E22'
			}
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
					'neutral-content': '#ffffff',
					'base-100': '#fff',
					'base-200': '#f6f7fb',
					'base-300': '#f0f0f0',
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
					'neutral-content': '#ffffff',
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
