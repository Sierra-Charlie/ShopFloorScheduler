// Script to update user passwords in production database
// Usage: node scripts/update-production-passwords.js

import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

// You'll need to set your production DATABASE_URL
const productionDatabaseUrl = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL;

if (!productionDatabaseUrl) {
  console.error('❌ PRODUCTION_DATABASE_URL environment variable not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: productionDatabaseUrl });

async function updateUserPassword(email, newPassword) {
  try {
    console.log(`🔐 Updating password for user: ${email}`);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password in the database
    const result = await pool.query(
      'UPDATE users SET password = $1, "updatedAt" = NOW() WHERE email = $2 RETURNING id, name, email',
      [hashedPassword, email]
    );
    
    if (result.rows.length === 0) {
      console.log(`❌ User not found: ${email}`);
      return false;
    }
    
    const user = result.rows[0];
    console.log(`✅ Password updated successfully for: ${user.name} (${user.email})`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to update password for ${email}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting password update script...\n');
  
  // Define the users and their new passwords here
  const passwordUpdates = [
    { email: 'sean@stonetreeinvest.com', password: 'Woodchuck' },
    // Add more users as needed:
    // { email: 'john.smith@vikingeng.com', password: 'NewPassword123' },
  ];
  
  for (const update of passwordUpdates) {
    await updateUserPassword(update.email, update.password);
    console.log(''); // Add spacing
  }
  
  console.log('🎉 Password update script completed!');
  await pool.end();
}

// Run the script
main().catch(console.error);