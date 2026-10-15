export function ReadingProse({ text }: { text: string }) {
  return <div className="prose-reading">{text.split(/\n\s*\n/).filter((part) => part.trim()).map((part, index) => <p key={index}>{part}</p>)}</div>;
}
