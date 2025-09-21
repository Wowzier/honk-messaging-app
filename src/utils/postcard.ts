export const POSTCARD_MAX_LINES = 6;
export const POSTCARD_MAX_LINE_LENGTH = 42;

const NEWLINE_REGEX = /\r\n|\r/g;

const WHITESPACE_TOKENIZER = /\S+|\s+/g;

function normalizeText(text: string): string {
  return text.replace(NEWLINE_REGEX, '\n');
}

function countWrappedLinesForSegment(segment: string, maxLineLength: number): number {
  if (segment.length === 0) {
    return 1;
  }

  const tokens = segment.match(WHITESPACE_TOKENIZER);
  if (!tokens) {
    return 1;
  }

  let lines = 1;
  let currentLength = 0;

  for (const token of tokens) {
    const isWhitespace = /^\s+$/.test(token);

    if (isWhitespace) {
      // Collapse long whitespace runs into single spaces while respecting manual spacing
      const spaceCount = token
        .replace(/\t/g, '    ')
        .split('')
        .reduce((count, char) => (char === '\n' ? count : count + 1), 0);

      if (currentLength === 0) {
        // Ignore leading spaces at the beginning of a line
        continue;
      }

      if (currentLength + spaceCount <= maxLineLength) {
        currentLength += spaceCount;
      } else {
        lines++;
        currentLength = Math.min(spaceCount, maxLineLength);
      }
      continue;
    }

    const wordLength = token.length;

    if (wordLength >= maxLineLength) {
      if (currentLength > 0) {
        lines++;
        currentLength = 0;
      }

      const fullLines = Math.floor(wordLength / maxLineLength);
      lines += fullLines;
      currentLength = wordLength % maxLineLength;

      if (currentLength === 0) {
        currentLength = 0;
      }
      continue;
    }

    if (currentLength === 0) {
      currentLength = wordLength;
      continue;
    }

    const projectedLength = currentLength + 1 + wordLength;
    if (projectedLength <= maxLineLength) {
      currentLength = projectedLength;
    } else {
      lines++;
      currentLength = wordLength;
    }
  }

  return lines;
}

export function calculatePostcardLineCount(
  text: string,
  maxLineLength: number = POSTCARD_MAX_LINE_LENGTH,
): number {
  if (!text) {
    return 0;
  }

  const normalized = normalizeText(text);
  const segments = normalized.split('\n');

  return segments.reduce((total, segment) => {
    return total + countWrappedLinesForSegment(segment, maxLineLength);
  }, 0);
}

export function isWithinPostcardLineLimit(
  text: string,
  maxLines: number = POSTCARD_MAX_LINES,
  maxLineLength: number = POSTCARD_MAX_LINE_LENGTH,
): boolean {
  return calculatePostcardLineCount(text, maxLineLength) <= maxLines;
}
