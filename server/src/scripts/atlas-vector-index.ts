/**
 * One-time setup: create Atlas Vector Search indexes for jobs + profiles.
 *
 * For Phase 2A we ship an in-memory cosine fallback in /api/match/* (see ../lib/ai.ts → cosineSim),
 * so this script is only needed once you outgrow that — typically thousands of jobs / profiles.
 *
 * Prereqs:
 *   - MongoDB Atlas cluster on M10+ (vector search not on free tier in all regions; check Atlas docs).
 *   - MONGO_URI in .env points at that cluster.
 *
 * Run with:  npm --prefix server run atlas-index
 */
import { connectDB } from '../lib/db.js'
import mongoose from 'mongoose'

const VECTOR_INDEX = {
  fields: [
    {
      type: 'vector' as const,
      path: 'embedding',
      numDimensions: 1024, // voyage-3-large
      similarity: 'cosine' as const,
    },
  ],
}

async function ensureIndex(coll: string, name: string) {
  const db = mongoose.connection.db
  if (!db) throw new Error('DB not connected')
  // @ts-expect-error - createSearchIndexes is supported on Atlas, not in stock TS types
  const result = await db.command({
    createSearchIndexes: coll,
    indexes: [
      {
        name,
        type: 'vectorSearch',
        definition: VECTOR_INDEX,
      },
    ],
  })
  console.log(`[atlas-index] ${coll}.${name}:`, result)
}

async function run() {
  await connectDB()
  await ensureIndex('jobs', 'jobs_vector')
  await ensureIndex('profiles', 'profiles_vector')
  await mongoose.disconnect()
  console.log('[atlas-index] done. The indexes may take a few minutes to build.')
}

run().catch((err) => {
  console.error('[atlas-index] failed:', err)
  console.error('Note: Atlas Vector Search requires a tier that supports it. The /api/match/*')
  console.error('routes will keep working with the in-memory cosine fallback.')
  process.exit(1)
})
