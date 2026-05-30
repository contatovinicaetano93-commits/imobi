#!/usr/bin/env node

/**
 * Generate PDF from Markdown audit report
 * Usage: node scripts/generate-audit-pdf.js
 */

const fs = require('fs');
const path = require('path');

// Read markdown file
const mdFile = path.join(__dirname, '../AUDIT_REPORT_BACKEND.md');
const mdContent = fs.readFileSync(mdFile, 'utf-8');

// Convert markdown to HTML
function markdownToHtml(md) {
  let html = md
    // Headers
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    // Code blocks
    .replace(/```(.+?)```/gs, (match, code) => {
      const lang = code.split('\n')[0].trim();
      const codeContent = code.split('\n').slice(1).join('\n');
      return `<pre><code>${codeContent}</code></pre>`;
    })
    // Inline code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Line breaks and paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, (match) => `<ul>${match}</ul>`)
    // Tables (simplified)
    .replace(/\|(.+?)\|/g, (match) => {
      const cells = match.split('|').slice(1, -1);
      return '<tr>' + cells.map(cell => `<td>${cell.trim()}</td>`).join('') + '</tr>';
    });

  return html;
}

// Create HTML document
const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audit Report - imobi Backend</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #1a73e8;
      border-bottom: 3px solid #1a73e8;
      padding-bottom: 10px;
      margin-top: 40px;
      font-size: 28px;
    }
    h2 {
      color: #2c3e50;
      margin-top: 30px;
      font-size: 22px;
    }
    h3 {
      color: #34495e;
      margin-top: 20px;
      font-size: 18px;
    }
    h4 {
      color: #555;
      margin-top: 15px;
      font-size: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #1a73e8;
      color: white;
      font-weight: 600;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', Courier, monospace;
      color: #d63384;
    }
    pre {
      background: #2d2d2d;
      color: #f8f8f2;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      line-height: 1.4;
      margin: 15px 0;
    }
    pre code {
      background: none;
      color: inherit;
      padding: 0;
    }
    ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    li {
      margin: 5px 0;
    }
    .status-pass {
      color: #28a745;
      font-weight: bold;
    }
    .status-fail {
      color: #dc3545;
      font-weight: bold;
    }
    .status-warning {
      color: #ffc107;
      font-weight: bold;
    }
    .metadata {
      background: #e3f2fd;
      padding: 15px;
      border-left: 4px solid #1a73e8;
      margin: 20px 0;
      border-radius: 4px;
    }
    .checklist {
      margin: 15px 0;
    }
    .checklist li {
      list-style: none;
    }
    .checklist li:before {
      content: "✓ ";
      color: #28a745;
      font-weight: bold;
      margin-right: 8px;
    }
    .page-break {
      page-break-after: always;
      margin-top: 50px;
    }
    strong {
      color: #2c3e50;
      font-weight: 600;
    }
    a {
      color: #1a73e8;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  ${markdownToHtml(mdContent)}

  <div style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #ddd; text-align: center; color: #999; font-size: 12px;">
    <p>Relatório de Auditoria — imobi Backend | Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
    <p>PDF gerado automaticamente a partir do arquivo AUDIT_REPORT_BACKEND.md</p>
  </div>
</body>
</html>
`;

// Write HTML file
const htmlFile = path.join(__dirname, '../AUDIT_REPORT_BACKEND.html');
fs.writeFileSync(htmlFile, htmlContent, 'utf-8');
console.log(`✅ HTML report generated: ${htmlFile}`);
console.log(`📋 To convert to PDF, open in browser and use Print → Save as PDF`);
console.log(`📄 Or visit: file://${htmlFile}`);
