#!/usr/bin/env node

const bcrypt = require('bcryptjs');

// This script helps verify password hashing for troubleshooting

const testPassword = process.argv[2];
const testHash = process.argv[3];

if (!testPassword) {
  console.log('Usage: node verify-password.js <password> [hash_to_test]');
  console.log('');
  console.log('Examples:');
  console.log('  node verify-password.js "Woodchuck"                    - Generate hash for Woodchuck');
  console.log('  node verify-password.js "Woodchuck" "$2b$10$abc..."    - Verify hash matches password');
  process.exit(1);
}

console.log(`Testing password: "${testPassword}"`);

// Generate new hash
const newHash = bcrypt.hashSync(testPassword, 10);
console.log(`Generated hash: ${newHash}`);

// Test existing hash if provided
if (testHash) {
  const isValid = bcrypt.compareSync(testPassword, testHash);
  console.log(`Hash verification: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`Provided hash: ${testHash}`);
} else {
  console.log('');
  console.log('To verify this hash later, run:');
  console.log(`node verify-password.js "${testPassword}" "${newHash}"`);
}