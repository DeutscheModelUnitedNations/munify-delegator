import { LANG } from '$env/static/private'
import type { Translation } from '../i18n-types'

const de = {
	navigation: {
		OVERVIEW: 'Übersicht',
		PAST_PROJECTS: 'Vergangene',
		REGISTER: 'Anmeldung',
	},
	profileOptions: {
		PROFILE: 'Profil',
		SWITCH_THEME: 'Thema wechseln',
		LOGOUT: 'Abmelden',
	},
} satisfies Translation

export default de
