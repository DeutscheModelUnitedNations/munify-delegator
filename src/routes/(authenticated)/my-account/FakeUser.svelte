<script lang="ts">
	import { fakerDE as faker } from '@faker-js/faker';
	interface Props {
		form: any;
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
