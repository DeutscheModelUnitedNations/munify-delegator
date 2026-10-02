<script lang="ts">
	import { fakerDE as faker } from '@faker-js/faker';
	import type { SuperForm } from 'sveltekit-superforms';
	import type { z } from 'zod';
	import type { userFormSchema } from './form-schema';
	interface Props {
		form: SuperForm<z.infer<typeof userFormSchema>>;
	}

	let { form }: Props = $props();

	let formData = $derived(form.form);

	const populateForm = () => {
		$formData.phone = '+4917612345678';
		$formData.zip = faker.location.zipCode({ format: '#####' });
		$formData.street = faker.location.streetAddress();
		$formData.city = faker.location.city();
		$formData.country = 'DEU';
		$formData.birthday = faker.date.birthdate();
		$formData.foodPreference = 'VEGAN';
		$formData.pronouns = 'he/him';
		$formData.emergencyContacts = 'Emergency Contact';
	};
</script>

<button class="btn btn-outline btn-primary mb-8" onclick={populateForm}>
	<i class="fas fa-magic"></i>
	Fake User
</button>
