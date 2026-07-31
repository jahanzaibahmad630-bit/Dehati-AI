import React from 'react';

/**
 * MarkdownRenderer.jsx
 * Urdu & RTL optimized Markdown renderer.
 * Cleanly renders headings, lists, bold/italic, dividers, and callouts
 * while sanitizing messy markdown artifacts (like trailing ## or misplaced *).
 */
export default function MarkdownRenderer({ text, className = '', dir = 'rtl', lang = 'ur' }) {
  if (!text) return null;

  const isLTR = dir === 'ltr' || lang === 'en';

  // Pre-process and normalize markdown text
  const normalizedText = text
    // Fix ## **Heading** ## or ## **Heading**
    .replace(/^([#]{1,6})\s*\*\*(.*?)\*\*\s*([#]{1,6})?$/gm, '$1 $2')
    // Fix ## Heading ##
    .replace(/^([#]{1,6})\s*(.*?)\s*([#]{1,6})$/gm, '$1 $2')
    // Fix trailing bullets from RTL AI generation (e.g. "text -")
    .replace(/^([^-•*\d\n].*?)\s*[-•*]$/gm, '- $1');

  const lines = normalizedText.split('\n');
  const elements = [];
  let key = 0;
  let i = 0;

  const parseInline = (str) => {
    if (!str) return '';
    let s = str;

    // Bold + Italic: ***text***
    s = s.replace(/\*\*\*(.*?)\*\*\*/g, (_, t) => `<strong><em>${t}</em></strong>`);
    // Bold: **text**
    s = s.replace(/\*\*(.*?)\*\*/g, (_, t) => `<strong>${t}</strong>`);
    // Italic / Bullet wrapper: *text*
    s = s.replace(/(^|\s)\*(.*?)\*(\s|$)/g, (_, p1, t, p2) => `${p1}<em>${t}</em>${p2}`);

    // Linkify URLs
    s = s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #2e5a27; text-decoration: underline;">$1</a>');

    // Linkify Helpline & Pakistani Phone numbers: e.g. 0800-15000, 0800 15000, 0300-1234567, 080015000
    s = s.replace(/\b(0800[-\s]?\d{5}|03\d{2}[-\s]?\d{7})\b/g, (match) => {
      const cleanNum = match.replace(/[-\s]/g, '');
      return `<a href="tel:${cleanNum}" style="color: #2e5a27; font-weight: 700; text-decoration: underline; unicode-bidi: embed;">${match}</a>`;
    });

    // Clean up stray double symbols
    s = s.replace(/#{2,}/g, '').replace(/\*{2,}/g, '');
    return s;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty lines
    if (trimmed === '') {
      elements.push(<div key={key++} style={{ height: '0.3rem' }} />);
      i++;
      continue;
    }

    // Horizontal rule: --- or *** or ___
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(
        <hr key={key++} style={{
          border: 'none',
          borderTop: '1px dashed rgba(47,74,30,0.25)',
          margin: '0.6rem 0'
        }} />
      );
      i++;
      continue;
    }

    // H1 / H2 / H3 Headings
    if (/^#{1,3}\s/.test(trimmed)) {
      const level = trimmed.match(/^(#{1,3})\s/)[1].length;
      const rawTitle = trimmed.replace(/^#{1,3}\s/, '');
      const content = parseInline(rawTitle);

      const fontSize = level === 1 ? '1.05rem' : level === 2 ? '0.98rem' : '0.92rem';
      const color = level === 1 ? '#1E3A1E' : level === 2 ? '#2F4A1E' : '#3D6128';

      elements.push(
        <div key={key++} style={{
          background: 'rgba(47, 74, 30, 0.06)',
          borderRight: isLTR ? 'none' : '3px solid #2F4A1E',
          borderLeft: isLTR ? '3px solid #2F4A1E' : 'none',
          borderRadius: isLTR ? '8px 4px 4px 8px' : '4px 8px 8px 4px',
          padding: '4px 10px',
          margin: '0.5rem 0 0.3rem',
          fontWeight: 700,
          fontSize,
          color,
          lineHeight: 1.5
        }} dangerouslySetInnerHTML={{ __html: content }} />
      );
      i++;
      continue;
    }

    // Bullet list: - or * or •
    if (/^[-•*]\s/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-•*]\s/.test(lines[i].trim())) {
        const itemText = parseInline(lines[i].trim().replace(/^[-•*]\s/, ''));
        items.push(
          <li key={items.length} style={{
            margin: '0.2rem 0',
            lineHeight: 1.85,
            fontSize: '0.92rem',
          }} dangerouslySetInnerHTML={{ __html: itemText }} />
        );
        i++;
      }
      elements.push(
        <ul key={key++} style={{
          paddingRight: isLTR ? '0' : '1.2rem',
          paddingLeft: isLTR ? '1.2rem' : '0',
          margin: '0.3rem 0',
          direction: isLTR ? 'ltr' : 'rtl',
          listStyleType: 'disc'
        }}>
          {items}
        </ul>
      );
      continue;
    }

    // Numbered list: 1. 2. 3.
    if (/^\d+[\.\)]\s/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+[\.\)]\s/.test(lines[i].trim())) {
        const itemText = parseInline(lines[i].trim().replace(/^\d+[\.\)]\s/, ''));
        items.push(
          <li key={items.length} style={{
            margin: '0.25rem 0',
            lineHeight: 1.85,
            fontSize: '0.92rem',
          }} dangerouslySetInnerHTML={{ __html: itemText }} />
        );
        i++;
      }
      elements.push(
        <ol key={key++} style={{
          paddingRight: isLTR ? '0' : '1.2rem',
          paddingLeft: isLTR ? '1.2rem' : '0',
          margin: '0.3rem 0',
          direction: isLTR ? 'ltr' : 'rtl'
        }}>
          {items}
        </ol>
      );
      continue;
    }

    // Paragraph
    const content = parseInline(trimmed);
    elements.push(
      <p key={key++} style={{
        margin: '0.25rem 0',
        lineHeight: 1.85,
        fontSize: '0.92rem'
      }} dangerouslySetInnerHTML={{ __html: content }} />
    );
    i++;
  }

  return (
    <div className={`markdown-body ${className}`} style={{
      direction: isLTR ? 'ltr' : 'rtl',
      textAlign: isLTR ? 'left' : 'right',
      fontFamily: isLTR ? 'Inter, system-ui, sans-serif' : 'Noto Nastaliq Urdu, sans-serif'
    }}>
      {elements}
    </div>
  );
}
