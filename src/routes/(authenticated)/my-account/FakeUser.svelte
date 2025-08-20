<script lang="ts">
	import { fakerDE as faker } from '@faker-js/faker';
	interface Props {
		form: any;
	}

	let { form }: Props = $props();

	let formData = $derived(form.form);

	const populateForm = () => {
		$formData.phone = faker.phone.number({ style: 'international' });
		$formData.zip = faker.location.zipCode({ format: '#####' });
		$formData.street = faker.location.streetAddress();
		$formData.city = faker.location.city();
		$formData.country = 'DEU';
		$formData.birthday = faker.date.birthdate();
		$formData.foodPreference = 'VEGAN';
	};
</script>

<button class="btn btn-primary" onclick={populateForm}>
	<i class="fas fa-magic"></i>
	Fake User
</button>
