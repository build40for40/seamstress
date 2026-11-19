import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const API = 'https://api.postmarkapp.com'

function token() {
  if (process.env.POSTMARK_SERVER_TOKEN) return process.env.POSTMARK_SERVER_TOKEN
  const vars = readFileSync(join(here, '../.dev.vars'), 'utf8')
  const found = /^POSTMARK_SERVER_TOKEN=(.*)$/m.exec(vars)?.[1]?.trim()
  if (!found) throw new Error('Set POSTMARK_SERVER_TOKEN or fill it in workers/api/.dev.vars')
  return found
}

type Template = { alias: string; name: string; subject: string; html: string; text: string }

async function call(method: string, path: string, body?: unknown) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Postmark-Server-Token': token() },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: response.status, body: (await response.json().catch(() => ({}))) as { Message?: string } }
}

async function sync(template: Template) {
  const payload = {
    Name: template.name,
    Alias: template.alias,
    Subject: template.subject,
    HtmlBody: template.html,
    TextBody: template.text,
    TemplateType: 'Standard',
  }
  const exists = (await call('GET', `/templates/${template.alias}`)).status === 200
  const result = exists ? await call('PUT', `/templates/${template.alias}`, payload) : await call('POST', '/templates', payload)
  if (result.status !== 200) throw new Error(`${template.alias}: ${result.status} ${result.body.Message ?? ''}`)
  console.log(`${exists ? 'updated' : 'created'} ${template.alias}`)
}

for (const file of readdirSync(here).filter((name) => name.endsWith('.json')).sort()) {
  await sync(JSON.parse(readFileSync(join(here, file), 'utf8')) as Template)
}
