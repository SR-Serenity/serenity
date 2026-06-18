import { getTranscriptCaptions } from '../src/app/(workspace)/[orgSlug]/office/[roomId]/components/meeting-note-blocks'

it('parses live transcript lines into caption speaker and text', () => {
  const captions = getTranscriptCaptions(
    [
      '<!-- serenity-live-meeting-start -->',
      '## Live transcript',
      '- 00:01 Huy: We decided to launch on Friday.',
      '- 00:02 Linh: I will follow up with QA.',
      '<!-- serenity-live-meeting-end -->',
    ].join('\n'),
    'live',
  )

  expect(captions).toEqual([
    {
      speaker: 'Huy',
      text: 'We decided to launch on Friday.',
      raw: '00:01 Huy: We decided to launch on Friday.',
    },
    {
      speaker: 'Linh',
      text: 'I will follow up with QA.',
      raw: '00:02 Linh: I will follow up with QA.',
    },
  ])
})
