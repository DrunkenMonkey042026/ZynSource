/**
 * One-shot translator: walks src/**/*.{ts,tsx}, extracts every `t('...')` literal,
 * asks OpenAI to translate the missing English strings into Hindi, and writes the
 * result back to client/src/locales/hi.json (merging with what's already there).
 *
 * Run with:  npm --prefix client run translate
 *
 * Requires OPENAI_API_KEY in env. Free tier? gpt-4o-mini at ~$0.15 per million input
 * tokens — translating the full app costs < $0.05.
 */
import OpenAI from 'openai'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOT = join(process.cwd(), 'src')
const HI_PATH = join(process.cwd(), 'src', 'locales', 'hi.json')

const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.error('Set OPENAI_API_KEY in your environment first (export OPENAI_API_KEY=...).')
  process.exit(1)
}

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const stat = statSync(full)
    if (stat.isDirectory()) yield* walk(full)
    else yield full
  }
}

const T_REGEX = /\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*(?:,[^)]*)?\)/g
const keys = new Set<string>()

for (const file of walk(ROOT)) {
  if (!['.ts', '.tsx'].includes(extname(file))) continue
  const src = readFileSync(file, 'utf-8')
  let m
  while ((m = T_REGEX.exec(src))) keys.add(m[2])
}

console.log(`Found ${keys.size} unique strings.`)

const existing: Record<string, string> = JSON.parse(readFileSync(HI_PATH, 'utf-8') || '{}')
const missing = [...keys].filter((k) => !existing[k])
console.log(`${missing.length} missing translations.`)
if (missing.length === 0) process.exit(0)

const openai = new OpenAI({ apiKey })

async function run() {
  // Batch in groups of 50 to keep prompts small
  const batches: string[][] = []
  for (let i = 0; i < missing.length; i += 50) batches.push(missing.slice(i, i + 50))
  for (const batch of batches) {
    const prompt = `Translate the following UI strings from English to natural, professional Hindi (हिन्दी), suitable for an Indian recruitment website. Keep interpolation placeholders like {{count}} exactly as-is. Return ONLY a JSON object mapping each English key to its Hindi translation.\n\n${JSON.stringify(batch, null, 2)}`
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000,
    })
    const raw = resp.choices[0]?.message?.content
    if (!raw) continue
    const parsed = JSON.parse(raw) as Record<string, string>
    for (const [k, v] of Object.entries(parsed)) existing[k] = v
    console.log(`+ ${Object.keys(parsed).length} strings`)
  }
  writeFileSync(HI_PATH, JSON.stringify(existing, null, 2) + '\n', 'utf-8')
  console.log(`Wrote ${Object.keys(existing).length} keys to hi.json`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
