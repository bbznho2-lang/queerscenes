import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    return jsonResponse({ error: 'Server configuration error' }, 500)
  }

  // Admin-only: verify the caller's JWT and admin role.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: userData, error: userError } = await supabase.auth.getUser(
    authHeader.slice('Bearer '.length).trim()
  )
  if (userError || !userData.user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }
  const { data: isAdmin } = await supabase.rpc('has_role', {
    _user_id: userData.user.id,
    _role: 'admin',
  })
  if (!isAdmin) {
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  let requestId: string
  try {
    const body = await req.json()
    requestId = body.requestId
    if (typeof requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(requestId)) {
      return jsonResponse({ error: 'requestId is required' }, 400)
    }
  } catch {
    return jsonResponse({ error: 'Invalid JSON in request body' }, 400)
  }

  const { data: request, error: lookupError } = await supabase
    .from('title_requests')
    .select('id, email, title_name')
    .eq('id', requestId)
    .maybeSingle()

  if (lookupError || !request) {
    return jsonResponse({ error: 'Title request not found' }, 404)
  }

  try {
    const result = await sendTemplateEmail('title-added', request.email, {
      templateData: {
        titleName: request.title_name,
        titleUrl: 'https://queerscenes.lovable.app/browse',
      },
      idempotencyKey: `title-added-${requestId}`,
    })
    const { error: logError } = await supabase.from('email_send_log').insert({
      message_id: null,
      template_name: 'title-added',
      recipient_email: request.email,
      status: result.sent ? 'sent' : 'suppressed',
    })
    if (logError) console.error('Failed to write email_send_log', { code: logError.code, message: logError.message })
    return jsonResponse({ success: true, suppressed: !result.sent })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Failed to send title-added notification', { message })
    const { error: logError } = await supabase.from('email_send_log').insert({
      message_id: null,
      template_name: 'title-added',
      recipient_email: request.email,
      status: 'failed',
      error_message: message.slice(0, 1000),
    })
    if (logError) console.error('Failed to write email_send_log', { code: logError.code, message: logError.message })
    return jsonResponse({ error: 'Failed to send notification email' }, 500)
  }
})
