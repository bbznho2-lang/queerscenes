import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.4.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Mirrors the legacy suppression webhook: keeps the suppressed_emails view and
// email_send_log audit trail up to date. Notification-only — Lovable enforces
// suppression at send time; nothing here gates future sends.
async function recordSuppression(
  recipient: string,
  reason: 'bounce' | 'complaint' | 'unsubscribe',
  logStatus: 'bounced' | 'complained' | 'suppressed',
  logMessage: string,
  messageId: string | undefined,
) {
  const email = recipient.toLowerCase()

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert({ email, reason, metadata: null }, { onConflict: 'email' })
  if (suppressError) {
    console.error('Failed to upsert suppressed email', {
      code: suppressError.code,
      message: suppressError.message,
    })
    throw new Error('Failed to write suppression')
  }

  // Dedupe redeliveries of the same outcome for the same send.
  if (messageId) {
    const { data: existing, error: dedupeError } = await supabase
      .from('email_send_log')
      .select('id')
      .eq('message_id', messageId)
      .eq('template_name', 'system')
      .eq('status', logStatus)
      .maybeSingle()
    if (dedupeError) {
      console.error('Failed to check send log for duplicates', {
        code: dedupeError.code,
        message: dedupeError.message,
      })
      throw new Error('Failed to check send log')
    }
    if (existing) return
  }

  const { error: insertError } = await supabase.from('email_send_log').insert({
    message_id: messageId ?? null,
    template_name: 'system',
    recipient_email: email,
    status: logStatus,
    error_message: logMessage,
    metadata: null,
  })
  if (insertError) {
    console.error('Failed to insert email_send_log', {
      code: insertError.code,
      message: insertError.message,
    })
    throw new Error('Failed to write send log')
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': async (event) => {
      console.log('Email bounced', { event_id: event.event_id })
      await recordSuppression(
        event.data.recipient,
        'bounce',
        'bounced',
        'Permanent bounce — email address is invalid or rejected',
        event.data.message_id,
      )
    },
    'email.complaint': async (event) => {
      console.log('Email complaint', { event_id: event.event_id })
      await recordSuppression(
        event.data.recipient,
        'complaint',
        'complained',
        'Spam complaint — recipient marked email as spam',
        event.data.message_id,
      )
    },
    'email.unsubscribed': async (event) => {
      console.log('Email unsubscribed', { event_id: event.event_id })
      await recordSuppression(
        event.data.recipient,
        'unsubscribe',
        'suppressed',
        'Recipient unsubscribed',
        event.data.message_id,
      )
    },
  },
})

Deno.serve((req) => handler(req))
