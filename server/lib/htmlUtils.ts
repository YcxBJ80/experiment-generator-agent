export interface HtmlExtractionResult {
  html: string | null;
  title: string | null;
}

const hasHtmlStructure = (snippet: string): boolean => {
  if (!snippet) return false;
  return /<\/?[a-z][^>]*>/i.test(snippet);
};

const normaliseWhitespace = (value: string): string => value.replace(/\r\n/g, '\n').trim();

const buildDocumentFromBody = (bodyMarkup: string): string => {
  const normalisedBody = bodyMarkup.trim();
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <title>Experiment Demo</title>',
    '</head>',
    normalisedBody.startsWith('<body') ? normalisedBody : `<body>\n${normalisedBody}\n</body>`,
    '</html>'
  ].join('\n');
};

const extractFromMatch = (source: string, pattern: RegExp): string | null => {
  const match = source.match(pattern);
  if (!match) return null;
  return normaliseWhitespace(match[1] ?? match[0]);
};

const detectHtmlDocument = (source: string): string | null => {
  const doctypeDocument = extractFromMatch(source, /(<!DOCTYPE html[\s\S]*?<\/html>)/i);
  if (doctypeDocument) return doctypeDocument;
  const htmlTagDocument = extractFromMatch(source, /(<html[\s\S]*?<\/html>)/i);
  return htmlTagDocument ?? null;
};

const tryExtractFromFencedBlock = (source: string): string | null => {
  const scanBlocks = (fence: '```' | '~~~'): string | null => {
    const pattern = new RegExp(`^\\s*${fence}([\\w-\\s]*)\\s*\\n?([\\s\\S]*?)\\s*${fence}`, 'gmi');
    const fallbackCandidates: string[] = [];

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      const language = (match[1] || '').trim().toLowerCase();
      const payload = normaliseWhitespace(match[2] || '');

      if (!payload) {
        continue;
      }

      if (!language && hasHtmlStructure(payload)) {
        return payload;
      }

      if (
        language.includes('html') ||
        language === 'xml' ||
        language === 'markup' ||
        language === 'htm' ||
        language === 'xhtml'
      ) {
        return payload;
      }

      fallbackCandidates.push(payload);
    }

    for (const candidate of fallbackCandidates) {
      if (hasHtmlStructure(candidate)) {
        return candidate;
      }
    }

    return null;
  };

  return scanBlocks('```') ?? scanBlocks('~~~');
};

const tryExtractFromBody = (source: string): string | null => {
  const bodyOnly = extractFromMatch(source, /(<body[\s\S]*?<\/body>)/i);
  if (!bodyOnly) return null;
  return buildDocumentFromBody(bodyOnly);
};

const deriveTitle = (html: string): string | null => {
  const match = html.match(/<title>(.*?)<\/title>/i);
  return match ? match[1].trim() : null;
};

export const extractExperimentHtml = (source: string): HtmlExtractionResult => {
  if (!source) {
    return { html: null, title: null };
  }

  const fencedHtml = tryExtractFromFencedBlock(source);
  if (fencedHtml) {
    return {
      html: fencedHtml,
      title: deriveTitle(fencedHtml)
    };
  }

  const documentHtml = detectHtmlDocument(source);
  if (documentHtml) {
    return {
      html: documentHtml,
      title: deriveTitle(documentHtml)
    };
  }

  const bodyFallback = tryExtractFromBody(source);
  if (bodyFallback) {
    return {
      html: bodyFallback,
      title: deriveTitle(bodyFallback)
    };
  }

  return { html: null, title: null };
};
