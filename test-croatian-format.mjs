// Croatian phone number format:
// Country code: +385
// Mobile prefixes: 91, 92, 95, 97, 98, 99 (historically), but also 9[0-9]
// Format: +385 9X XXX XXXX (10 digits after country code)

const croatianNumbers = [
  '+385951234567',   // Issue number
  '+38591234567',    // 9 digits (older format)
  '+385901234567',   // Starting with 90
  '+385921234567',   // Starting with 92
  '+385971234567',   // Starting with 97
  '+385981234567',   // Starting with 98
  '+385991234567',   // Starting with 99
];

// According to Croatian number format specification:
// Mobile numbers in Croatia start with 9 and have 8 or 9 digits after it
// Format: +385 9X XXX XXX or +385 9X XXX XXXX

const croatianPhoneRegex = /^(\+?385|0)?9[0-9]\d{6,7}$/;

console.log('Testing Croatian phone numbers:');
croatianNumbers.forEach(num => {
  console.log(`${num}: ${croatianPhoneRegex.test(num)}`);
});
