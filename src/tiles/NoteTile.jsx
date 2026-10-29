export default function NoteTile({ data, onChange }) {
  return (
    <textarea
      value={data.text ?? ""}
      placeholder="Type a note..."
      onChange={(e) => onChange({ text: e.target.value })}
    />
  );
}