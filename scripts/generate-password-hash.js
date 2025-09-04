// Quick script to generate bcrypt password hashes
// Usage: node scripts/generate-password-hash.js "YourNewPassword"

import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.log('Usage: node scripts/generate-password-hash.js "YourNewPassword"');
  process.exit(1);
}

async function generateHash() {
  const hash = await bcrypt.hash(password, 10);
  console.log('\n🔐 Password Hash Generated:');
  console.log('='.repeat(50));
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
  console.log('='.repeat(50));
  console.log('\nCopy the hash above and use it in your SQL UPDATE command:\n');
  console.log(`UPDATE users SET password = '${hash}', "updatedAt" = NOW() WHERE email = 'your@email.com';\n`);
}

generateHash().catch(console.error);