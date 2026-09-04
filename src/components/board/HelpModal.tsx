import { Keyboard, Smartphone } from "lucide-react";
import { Modal } from "./Modal";

interface HelpModalProps {
  onClose: () => void;
}

const DESKTOP_TIPS = [
  ["Drag a card", "Move it between columns or reorder inside one"],
  ["Right-click a card", "Open the task menu (expand, edit, move, delete)"],
  ["Double-click a card", "Same task menu, without the right-click"],
  ["Click the title", "Open the read-only task view"],
  ["Read more…", "Shown when notes are longer than the card preview"],
  ["Click a tag", "Tag menu — filter by it, recolor it or remove it"],
  ["Tags filter", "Pick several tags at once; chips below the filters show what's active"],
  ["Escape", "Close the open modal or menu"],
  ["Drag a dialog corner", "Resize it — the new size is remembered next time"],
];

const MOBILE_TIPS = [
  ["Scroll the board", "Todo, In Progress and Done stack vertically"],
  ["Scroll inside a list", "Each list scrolls on its own"],
  ["Drag a list's bottom bar", "Make that list taller or shorter; the size is saved"],
  ["Double-tap a card", "Open the task menu"],
  ["Use the task menu", "Move between columns without dragging"],
  ["Read more…", "Opens the full task notes"],
  ["Tap a tag", "Tag menu — filter, recolor or remove"],
];

const FORMATTING = [
  ["**bold**", "bold text"],
  ["*italic*", "italic text"],
  ["~~strike~~", "struck-through text"],
  ["`inline code`", "inline monospace"],
  ["> quote", "blockquote"],
  ["[label](https://…)", "link"],
  ["```py\\ncode\\n```", "code block with syntax highlighting (py, js, java, cpp, html, css)"],
  ["```{#ff5555}\\ntext\\n```", "colored text block"],
];

export const HelpModal = ({ onClose }: HelpModalProps) => {
  const showDesktop = true;
  const showMobile = true;

  return (
    <Modal
      title="Help & formatting"
      onClose={onClose}
      baseWidth={640}
      footer={
        <button className="btn-primary" onClick={onClose}>
          Got it
        </button>
      }
    >
      <div className="flex flex-col gap-6">
        {showDesktop ? (
          <section className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Keyboard size={16} className="text-primary" />{" "}
              {showMobile ? "On desktop" : "Gestures & shortcuts"}
            </h3>
            <dl className="flex flex-col gap-1.5">
              {DESKTOP_TIPS.map(([action, result]) => (
                <div
                  key={action}
                  className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] gap-3 text-sm"
                >
                  <dt className="font-semibold">{action}</dt>
                  <dd className="text-muted-foreground">{result}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {showMobile ? (
          <section className="flex flex-col gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Smartphone size={16} className="text-primary" />{" "}
              {showDesktop ? "On mobile" : "Touch gestures"}
            </h3>
            <dl className="flex flex-col gap-1.5">
              {MOBILE_TIPS.map(([action, result]) => (
                <div
                  key={action}
                  className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] gap-3 text-sm"
                >
                  <dt className="font-semibold">{action}</dt>
                  <dd className="text-muted-foreground">{result}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-bold">Formatting guide</h3>
          <p className="text-xs text-muted-foreground">
            Task notes use chat-style markdown. Type any of these in the notes field:
          </p>

          <div className="flex flex-col gap-1.5">
            {FORMATTING.map(([syntax, result]) => (
              <div
                key={syntax}
                className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-start gap-3 rounded-lg border border-border bg-elevated px-3 py-2"
              >
                <code className="whitespace-pre-wrap break-words font-mono text-xs text-primary">
                  {syntax}
                </code>
                <span className="text-xs text-muted-foreground">{result}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-1.5">
          <h3 className="text-sm font-bold">Your data</h3>
          <p className="text-xs text-muted-foreground">
            Everything is stored in this browser. Use the download button in the top bar to back the
            board up as JSON, and the upload button to restore it on another device.
          </p>
        </section>
      </div>
    </Modal>
  );
};
