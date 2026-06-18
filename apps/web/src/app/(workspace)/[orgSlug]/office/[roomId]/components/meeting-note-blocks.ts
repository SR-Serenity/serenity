const LIVE_BLOCK_START = '<!-- serenity-live-meeting-start -->'
const LIVE_BLOCK_END = '<!-- serenity-live-meeting-end -->'
const AI_BLOCK_START = '<!-- serenity-ai-meeting-notes-start -->'
const AI_BLOCK_END = '<!-- serenity-ai-meeting-notes-end -->'
const FINAL_BLOCK_START = '<!-- serenity-final-transcript-start -->'
const FINAL_BLOCK_END = '<!-- serenity-final-transcript-end -->'

export function extractManagedBlock(content: string, startMarker: string, endMarker: string) {
  const start = content.indexOf(startMarker)
  const end = content.indexOf(endMarker)
  if (start < 0 || end < start) {
    return ''
  }
  return content.slice(start + startMarker.length, end).trim()
}

export function getAiNotesMarkdown(content: string) {
  return extractManagedBlock(content, AI_BLOCK_START, AI_BLOCK_END)
}

export function getLiveTranscriptMarkdown(content: string) {
  return extractManagedBlock(content, LIVE_BLOCK_START, LIVE_BLOCK_END)
}

export function getTranscriptMarkdown(content: string) {
  return (
    extractManagedBlock(content, FINAL_BLOCK_START, FINAL_BLOCK_END) ||
    getLiveTranscriptMarkdown(content)
  )
}

export type TranscriptCaption = {
  speaker: string | null
  text: string
  raw: string
}

function cleanTranscriptLine(line: string) {
  return line
    .trim()
    .replace(/^-+\s*/, '')
    .trim()
}

export function getTranscriptCaptions(content: string, source: 'live' | 'any' = 'any') {
  const block = source === 'live' ? getLiveTranscriptMarkdown(content) : getTranscriptMarkdown(content)
  if (!block) {
    return []
  }

  return block
    .split('\n')
    .map(cleanTranscriptLine)
    .filter(line =>
      line &&
      line !== '## Live transcript' &&
      line !== '## Final transcript' &&
      line !== 'No transcript yet.',
    )
    .map(line => {
      const timestampMatch = line.match(/^(?:(?:\d{1,2}:)?\d{2}:\d{2}|\d{1,2}:\d{2}\s?[AP]M)\s+([^:]{1,80}):\s+(.+)$/i)
      if (timestampMatch) {
        return {
          speaker: timestampMatch[1].trim(),
          text: timestampMatch[2].trim(),
          raw: line,
        }
      }

      const speakerMatch = line.match(/^([^:]{1,80}):\s+(.+)$/)
      if (speakerMatch) {
        return {
          speaker: speakerMatch[1].trim(),
          text: speakerMatch[2].trim(),
          raw: line,
        }
      }

      return {
        speaker: null,
        text: line,
        raw: line,
      }
    })
    .filter(caption => caption.text.length > 0)
}
