import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json().catch(() => null)
    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    if (!message) return json({ error: 'Message is required' }, 400)
    if (message.length > 2000) return json({ error: 'Message is too long' }, 400)

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) return json({ error: 'OPENAI_API_KEY is not configured' }, 503)

    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are StudyVerse AI, a concise and encouraging study assistant. Give practical student-friendly advice. Do not claim to be a doctor, lawyer, or other professional. Prefer clear steps, short plans, and actionable suggestions.' },
          { role: 'user', content: message },
        ],
        temperature: 0.4,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('AI provider error', response.status, detail.slice(0, 500))
      return json({ error: 'AI provider request failed' }, 502)
    }

    const result = await response.json()
    const reply = result?.choices?.[0]?.message?.content?.trim()
    if (!reply) return json({ error: 'AI returned an empty response' }, 502)

    return json({ reply })
  } catch (error) {
    console.error('study-assistant error', error)
    return json({ error: 'Unexpected assistant error' }, 500)
  }
})

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
