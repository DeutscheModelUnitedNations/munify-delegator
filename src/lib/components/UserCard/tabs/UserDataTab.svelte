<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { translateGender } from '$lib/services/enumTranslations';
	import Grid from '$lib/components/InfoGrid/Grid.svelte';
	import Entry from '$lib/components/InfoGrid/Entry.svelte';
	import GlobalNotes from '../../../../routes/(authenticated)/management/[conferenceId]/participants/GlobalNotes.svelte';

	interface Props {
		user:
			| {
					id: string;
					given_name: string;
					family_name: string;
					pronouns?: string | null;
					phone?: string | null;
					email?: string | null;
					street?: string | null;
					apartment?: string | null;
					zip?: string | null;
					city?: string | null;
					country?: string | null;
					gender?: string | null;
					birthday?: string | null;
					foodPreference?: string | null;
					emergencyContacts?: string | null;
					globalNotes?: string | null;
			  }
			| null
			| undefined;
		userId: string;
		conferenceId: string;
		conference:
			| { id: string; startConference?: string | null; endConference?: string | null }
			| null
			| undefined;
		onUpdate?: () => void;
	}

	let { user, userId, conferenceId, conference, onUpdate }: Props = $props();

	const localizedFoodPreference = $derived.by(() => {
		switch (user?.foodPreference) {
			case 'OMNIVORE':
				return m.omnivore();
			case 'VEGETARIAN':
				return m.vegetarian();
			case 'VEGAN':
				return m.vegan();
			default:
				return user?.foodPreference ?? 'N/A';
		}
	});

	const genderIcon = $derived.by(() => {
		switch (user?.gender) {
			case 'MALE':
				return 'mars';
			case 'FEMALE':
				return 'venus';
			case 'DIVERSE':
				return 'transgender';
			default:
				return 'genderless';
		}
	});

	const foodIcon = $derived.by(() => {
		switch (user?.foodPreference) {
			case 'OMNIVORE':
				return 'drumstick-bite';
			case 'VEGETARIAN':
				return 'carrot';
			case 'VEGAN':
				return 'leaf';
			default:
				return 'utensils';
		}
	});

	let globalNotesOpen = $state(false);
</script>

{#if user}
	<div class="flex flex-col gap-4">
		<Grid>
			<Entry title={m.phone()} fontAwesomeIcon="phone">
				{user.phone ?? 'N/A'}
			</Entry>
			<Entry title={m.email()} fontAwesomeIcon="envelope">
				{user.email ?? 'N/A'}
			</Entry>
			<Entry title={m.address()} fontAwesomeIcon="house">
				{#if user.street || user.city}
					{user.street ?? ''}
					{user.apartment ?? ''}<br />
					{user.zip ?? ''}
					{user.city ?? ''}
					{user.country ?? ''}
				{:else}
					N/A
				{/if}
			</Entry>
			<Entry title={m.genderAndPronouns()} fontAwesomeIcon={genderIcon}>
				{user.gender ? translateGender(user.gender) : 'N/A'}{user.pronouns
					? ` (${user.pronouns})`
					: ''}
			</Entry>
			<Entry title={m.birthday()} fontAwesomeIcon="birthday-cake">
				{user.birthday ? new Date(user.birthday).toLocaleDateString() : 'N/A'}
			</Entry>
			<Entry title={m.foodPreference()} fontAwesomeIcon={foodIcon}>
				{localizedFoodPreference}
			</Entry>

			<Entry title={m.emergencyContacts()} fontAwesomeIcon="light-emergency-on">
				{user.emergencyContacts ?? 'N/A'}
			</Entry>
		</Grid>

		<div class="flex flex-col gap-2 mt-8">
			<h3 class="text-lg font-bold">{m.globalNotes()}</h3>
			<p class="text-base-content/60 text-sm">{m.globalNotesDescription()}</p>
			<div class="bg-base-200 min-h-12 rounded-lg p-3 whitespace-pre-wrap">
				{user.globalNotes ?? '–'}
			</div>
			<button class="btn btn-sm btn-outline self-start" onclick={() => (globalNotesOpen = true)}>
				<i class="fa-duotone fa-pen-to-square"></i>
				{m.editGlobalNotes()}
			</button>
		</div>
	</div>
{/if}

{#if user}
	<GlobalNotes globalNotes={user.globalNotes ?? ''} bind:open={globalNotesOpen} id={user.id} />
{/if}
