export function renderBasicMarkdown(text: string): string {
  if (!text) return ""

  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  let html = escaped
  html = html.replace(/^### (.+)$/gm, "<h4 class=\"mb-2 mt-3 font-semibold text-foreground\">$1</h4>")
  html = html.replace(/^## (.+)$/gm, "<h4 class=\"mb-2 mt-3 font-semibold text-foreground\">$1</h4>")
  html = html.replace(/^# (.+)$/gm, "<h3 class=\"mb-2 mt-3 text-base font-semibold text-foreground\">$1</h3>")
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong class=\"font-semibold text-foreground\">$1</strong>")
  html = html.replace(/^- (.+)$/gm, "<li class=\"ml-4 list-disc\">$1</li>")
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (block) => `<ul class=\"my-2 space-y-1\">${block}</ul>`)
  html = html.replace(/\n\n/g, "</p><p class=\"mb-2 text-muted-foreground\">")
  html = html.replace(/\n/g, "<br />")

  return `<div class="font-mono text-xs leading-relaxed text-muted-foreground"><p class="mb-2">${html}</p></div>`
}
