/**
 * Export every collection to one JSON file per collection (MongoDB Extended JSON,
 * so ObjectIds and dates survive a restore).
 *
 *   node scripts/backup.js [output-directory]     (default: ./data_dump/<timestamp>)
 *
 * Uses MONGODB_URI from the environment or backend/.env. The free Atlas tier has
 * no automatic backups, so .github/workflows/backup.yml runs this weekly.
 * The output contains personal data (emails, password hashes): keep it private.
 */
import dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.resolve(process.argv[2] || path.join('data_dump', stamp));

await mongoose.connect(process.env.MONGODB_URI);
try {
  const { EJSON } = mongoose.mongo.BSON;
  const db = mongoose.connection.db;
  await fs.mkdir(outDir, { recursive: true });

  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  let total = 0;
  for (const { name } of collections) {
    if (name.startsWith('system.')) continue;
    const docs = await db.collection(name).find({}).toArray();
    await fs.writeFile(path.join(outDir, `${name}.json`), EJSON.stringify(docs, null, 2, { relaxed: false }));
    console.log(`${name}: ${docs.length} documents`);
    total += docs.length;
  }
  console.log(`Backup written to ${outDir} (${total} documents in total).`);
} finally {
  await mongoose.disconnect();
}
