export function RecommendationPreview({ text }: { text: string }) {
  const sections = parseRecommendation(text).slice(0, 5);
  if (!sections.length) {
    return <p className="mt-4 line-clamp-5 text-sm leading-6 text-slate-600">{cleanMarkdown(text)}</p>;
  }
  return (
    <div className="mt-4 space-y-3">
      {sections.map((section, index) => (
        <div key={`${section.title}-${index}`} className="rounded-xl bg-[#f8fafc] p-3">
          <h3 className="text-xs font-semibold text-slate-500">{section.title}</h3>
          <ul className="mt-2 space-y-1.5">
            {section.items.slice(0, 4).map((line) => (
              <li key={line} className="line-clamp-2 text-sm leading-6 text-slate-700">{line}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function parseRecommendation(text: string) {
  const sections: Array<{ title: string; items: string[] }> = [];
  let current: { title: string; items: string[] } | null = null;
  for (const rawLine of (text || "").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const heading = line.match(/^#{1,4}\s*(.+)$/);
    if (heading) {
      current = { title: cleanMarkdown(heading[1]), items: [] };
      sections.push(current);
      continue;
    }
    const cleaned = cleanMarkdown(line);
    if (!cleaned) continue;
    if (!current) {
      current = { title: "核心建议", items: [] };
      sections.push(current);
    }
    current.items.push(cleaned);
  }
  return sections.filter((section) => section.items.length);
}

function cleanMarkdown(text: string) {
  return (text || "")
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+[.)、]\s*/, "")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
