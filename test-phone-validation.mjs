import validator from 'validator';

const testPhoneNumbers = [
  '+385951234567',  // Croatian phone number from the issue
  '+385 95 123 4567', // Croatian with spaces
  '+385-95-123-4567', // Croatian with dashes
  '+4915123456789', // German
  '+33612345678',   // French
  '+447700900123',  // UK
  '+12025551234',   // US
];

console.log('Testing phone numbers with validator.isMobilePhone():');
console.log('='.repeat(60));

testPhoneNumbers.forEach(phone => {
  const cleaned = phone.replaceAll(' ', '').replaceAll('-', '');
  const isValidStrict = validator.isMobilePhone(cleaned, 'any', { strictMode: true });
  const isValidNonStrict = validator.isMobilePhone(cleaned, 'any', { strictMode: false });
  
  console.log(`\nPhone: ${phone}`);
  console.log(`Cleaned: ${cleaned}`);
  console.log(`  Valid (any, strict): ${isValidStrict}`);
  console.log(`  Valid (any, non-strict): ${isValidNonStrict}`);
});
