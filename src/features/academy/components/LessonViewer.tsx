"use client"

import { useMemo } from "react"

interface LessonViewerProps {
    content: string
}

export function LessonViewer({ content }: LessonViewerProps) {
    const html = useMemo(() => renderMarkdown(content), [content])

    return (
        <div
            className="prose prose-sm prose-slate max-w-none
                prose-headings:font-bold prose-headings:text-slate-900
                prose-h1:text-lg prose-h1:border-b prose-h1:border-slate-100 prose-h1:pb-2 prose-h1:mb-4
                prose-h2:text-base prose-h2:mt-6
                prose-h3:text-sm
                prose-p:text-slate-600 prose-p:text-sm prose-p:leading-relaxed
                prose-strong:text-slate-900
                prose-blockquote:border-l-indigo-400 prose-blockquote:bg-indigo-50/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-indigo-800
                prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
                prose-li:text-sm prose-li:text-slate-600
                prose-ol:list-decimal prose-ul:list-disc"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    )
}

function renderMarkdown(md: string): string {
    if (!md) return '<p class="text-slate-400 italic">Sin contenido</p>'

    let html = md
        // Escape HTML
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

    // Bold & italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

    // Inline code
    html = html.replace(/`(.+?)`/g, '<code>$1</code>')

    // Blockquotes (handle &gt; from escaping)
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote><p>$1</p></blockquote>')

    // Ordered lists
    html = html.replace(/^(\d+)\. (.+)$/gm, '<li data-ol>$2</li>')
    html = html.replace(/((?:<li data-ol>.*<\/li>\n?)+)/g, '<ol>$1</ol>')
    html = html.replace(/ data-ol/g, '')

    // Unordered lists
    html = html.replace(/^- (.+)$/gm, '<li data-ul>$1</li>')
    html = html.replace(/((?:<li data-ul>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
    html = html.replace(/ data-ul/g, '')

    // Paragraphs — wrap lines not already in tags
    html = html.replace(/^(?!<[houlb])(.+)$/gm, '<p>$1</p>')

    // Clean up empty lines
    html = html.replace(/<p><\/p>/g, '')

    return html
}
