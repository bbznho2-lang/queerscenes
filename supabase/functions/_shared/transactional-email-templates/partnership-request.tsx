import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  email?: string
  kind?: string
  link?: string
  message?: string
}

const KIND_LABELS: Record<string, string> = {
  creator: 'Creator / Influencer',
  brand: 'Brand or community',
  press: 'Press',
  distributor: 'Distributor',
  other: 'Other',
}

const Email = ({ name, email, kind, link, message }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New partnership request from {name || 'a visitor'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>New partnership request</Heading>
        <Text style={text}><strong>Name:</strong> {name || '-'}</Text>
        <Text style={text}><strong>Email:</strong> {email || '-'}</Text>
        <Text style={text}><strong>I am a:</strong> {KIND_LABELS[kind || ''] || kind || '-'}</Text>
        {link ? <Text style={text}><strong>Profile/website:</strong> {link}</Text> : null}
        <Text style={text}><strong>Message:</strong></Text>
        <Text style={text}>{message || '-'}</Text>
        <Text style={footer}>Sent from the Queer Scenes partnerships form</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    data?.name ? `Partnership request from ${data.name}` : 'New partnership request',
  displayName: 'Partnership request notification',
  previewData: { name: 'Jane Doe', email: 'jane@example.com', kind: 'creator', link: 'https://example.com', message: 'I would love to share your catalog with my audience.' },
  to: 'scenes.queer@gmail.com',
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const heading = { color: '#a855f7', fontSize: '22px' }
const text = { color: '#1a1a1a', fontSize: '15px', lineHeight: '1.5' }
const footer = { color: '#666666', fontSize: '12px', marginTop: '24px' }
