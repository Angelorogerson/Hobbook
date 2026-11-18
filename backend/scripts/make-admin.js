/**
 * Give an existing account the admin (moderation) role, or take it away.
 *
 *   node scripts/make-admin.js you@example.org            # make admin
 *   node scripts/make-admin.js you@example.org --revoke   # back to normal user
 *
 * Uses MONGODB_URI from the environment or backend/.env. The account must
 * already exist: register through the app first.
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { User } from '../models/index.js';

const email = String(process.argv[2] || '').trim().toLowerCase();
const revoke = process.argv.includes('--revoke');

if (!email || email.startsWith('--')) {
  console.error('Usage: node scripts/make-admin.js <email> [--revoke]');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);
try {
  const role = revoke ? 'user' : 'admin';
  const user = await User.findOneAndUpdate({ email }, { $set: { role } }, { new: true });
  if (!user) {
    console.error(`No account found for ${email}. Register in the app first.`);
    process.exitCode = 1;
  } else {
    console.log(`${user.email} now has the role "${user.role}".`);
  }
} finally {
  await mongoose.disconnect();
}
