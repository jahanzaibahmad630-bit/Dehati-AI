/**
 * MarkdownRenderer.jsx
 * Lightweight Urdu-friendly markdown renderer.
 * Handles the markdown Claude AI produces in agricultural recommendations:
 * - ## / ### headings
 * - **bold** and *italic*
 * - --- horizontal rule
 * - Bullet lists (- item or • item)
 * - Numbered lists (1. item)
 * - Line breaks
 * - ✅ ⚠️ 🌾 emojis (pass through fine)
 */
export default function MarkdownRenderer({ text, className = '' }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let key = 0;
  let i = 0;

  const parsInline = (str) => {
    // Bold+italic: ***text***
    str = str.replace(/\*\*\*(.*?)\*\*\*/g, (_, t) => `<strong><em>${t}</em></strong>`);
    // Bold: **text**
    str = str.replace(/\*\*(.*?)\*\*/g, (_, t) => `<strong>${t}</strong>`);
    // Italic: *text*
    str = str.replace(/\*(.*?)\*/g, (_, t) => `<em>${t}</em>`);
    return str;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines (add spacing)
    if (trimmed === '') {
      elements.push(<div key={key++} style={{ height: '0.4rem' }} />);
      i++;
      continue;
    }

    // Horizontal rule: --- or *** or ___
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(
        <hr key={key++} style={{
          border: 'none', borderTop: '1px solid rgba(47,74,30,0.2)',
          margin: '0.6rem 0'
        }} />
      );
      i++;
      continue;
    }

    // H2: ## heading
    if (trimmed.startsWith('## ')) {
      const content = parsInline(trimmed.slice(3));
      elements.push(
        <h3 key={key++} style={{
          fontSize: '1rem', fontWeight: 700, color: '#2F4A1E',
          margin: '0.75rem 0 0.3rem', lineHeight: 1.5
        }} dangerouslySetInnerHTML={{ __html: content }} />
      );
      i++;
      continue;
    }

    // H3: ### heading
    if (trimmed.startsWith('### ')) {
      const content = parsInline(trimmed.slice(4));
      elements.push(
        <h4 key={key++} style={{
          fontSize: '0.95rem', fontWeight: 700, color: '#3a5c24',
          margin: '0.6rem 0 0.25rem', lineHeight: 1.5
        }} dangerouslySetInnerHTML={{ __html: content }} />
      );
      i++;
      continue;
    }

    // H1: # heading
    if (trimmed.startsWith('# ')) {
      const content = parsInline(trimmed.slice(2));
      elements.push(
        <h2 key={key++} style={{
          fontSize: '1.1rem', fontWeight: 700, color: '#2F4A1E',
          margin: '0.5rem 0 0.4rem', lineHeight: 1.5
        }} dangerouslySetInnerHTML={{ __html: content }} />
      );
      i++;
      continue;
    }

    // Bullet list item: starts with - or • or *
    if (/^[-•*]\s/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-•*]\s/.test(lines[i].trim())) {
        const itemText = parsInline(lines[i].trim().replace(/^[-•*]\s/, ''));
        items.push(
          <li key={items.length} style={{
            margin: '0.2rem 0', lineHeight: 1.8,
            listStyleType: 'disc', marginRight: '1rem'
          }} dangerouslySetInnerHTML={{ __html: itemText }} />
        );
        i++;
      }
      elements.push(
        <ul key={key++} style={{
          paddingRight: '1.5rem', paddingLeft: '0',
          margin: '0.3rem 0', direction: 'rtl'
        }}>
          {items}
        </ul>
      );
      continue;
    }

    // Numbered list: 1. item
    if (/^\d+\.\s/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const itemText = parsInline(lines[i].trim().replace(/^\d+\.\s/, ''));
        items.push(
          <li key={items.length} style={{
            margin: '0.25rem 0', lineHeight: 1.8, marginRight: '1rem'
          }} dangerouslySetInnerHTML={{ __html: itemText }} />
        );
        i++;
      }
      elements.push(
        <ol key={key++} style={{
          paddingRight: '1.5rem', paddingLeft: '0',
          margin: '0.3rem 0', direction: 'rtl'
        }}>
          {items}
        </ol>
      );
      continue;
    }

    // Regular paragraph
    const content = parsInline(trimmed);
    elements.push(
      <p key={key++} style={{
        margin: '0.3rem 0', lineHeight: 1.9, fontSize: '0.93rem'
      }} dangerouslySetInnerHTML={{ __html: content }} />
    );
    i++;
  }

  return (
    <div className={`markdown-body ${className}`} style={{
      direction: 'rtl', textAlign: 'right',
      fontFamily: 'Noto Nastaliq Urdu, serif'
    }}>
      {elements}
    </div>
  );
}
