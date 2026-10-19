import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  titleName?: string
  titleUrl?: string
}

const Email = ({ titleName, titleUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Good news — a title you asked for is now on Queer Scenes</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Queer Scenes</Heading>
        <Text style={text}>
          Good news! {titleName ? `"${titleName}"` : 'A title you requested'} is now available on Queer Scenes.
        </Text>
        <Text style={text}>
          You asked for it on our wishlist, and we found it. Watch it now with hand-made subtitles.
        </Text>
        {titleUrl ? (
          <Button style={button} href={titleUrl}>Watch now</Button>
        ) : null}
        <Text style={footer}>With love, the Queer Scenes team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    data?.titleName ? `"${data.titleName}" is now on Queer Scenes` : 'A title you requested is now on Queer Scenes',
  displayName: 'Wishlist title added',
  previewData: { titleName: 'Fingersmith', titleUrl: 'https://queerscenes.lovable.app/browse' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const heading = { color: '#a855f7', fontSize: '22px' }
const text = { color: '#1a1a1a', fontSize: '15px', lineHeight: '1.5' }
const button = { backgroundColor: '#a855f7', color: '#ffffff', padding: '12px 24px', borderRadius: '24px', fontSize: '14px', fontWeight: 'bold', textDecoration: 'none' }
const footer = { color: '#666666', fontSize: '12px', marginTop: '24px' }
