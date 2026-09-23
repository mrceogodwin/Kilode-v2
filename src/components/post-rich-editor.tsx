import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Undo2,
} from "lucide-react";
import { postBodyPlain, sanitizePostHtml } from "@/lib/post-body";
import { safeHttpUrl } from "@/lib/qonvo-data";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Featured image (data URL or https) — Insert image can reuse it. */
  featuredSrc?: string;
  className?: string;
};

function run(cmd: string, value?: string) {
  try {
    document.execCommand(cmd, false, value);
  } catch {
    /* ignore unsupported */
  }
}

export function PostRichEditor({
  value,
  onChange,
  placeholder = "Write the full post…",
  featuredSrc,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [empty, setEmpty] = useState(!postBodyPlain(value));

  // External reset (e.g. after Publish clears body)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!value && el.innerHTML) {
      el.innerHTML = "";
      setEmpty(true);
    }
  }, [value]);

  const emit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const html = sanitizePostHtml(el.innerHTML);
    setEmpty(!postBodyPlain(html));
    onChange(html);
  }, [onChange]);

  const focusEditor = () => {
    ref.current?.focus();
  };

  const tool = (fn: () => void) => {
    focusEditor();
    fn();
    emit();
  };

  function applyLink() {
    const safe = safeHttpUrl(urlDraft);
    if (!safe) return;
    tool(() => run("createLink", safe));
    setLinkOpen(false);
    setUrlDraft("");
  }

  function applyImage() {
    const fromDraft = safeHttpUrl(urlDraft);
    const src =
      fromDraft ||
      (featuredSrc && (safeHttpUrl(featuredSrc) || featuredSrc.startsWith("data:image/")) ? featuredSrc : "");
    if (!src) return;
    const alt = "Image";
    tool(() => {
      // insertHTML is widely supported; fallback to execCommand insertImage
      const ok = document.execCommand(
        "insertHTML",
        false,
        `<img src="${src.replace(/"/g, "&quot;")}" alt="${alt}" />`,
      );
      if (!ok) run("insertImage", src);
    });
    setImgOpen(false);
    setUrlDraft("");
  }

  const btn =
    "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-panel text-fg/90 transition hover:border-lime-2/50 hover:text-lime-2 active:scale-95";

  return (
    <div className={`mt-2 overflow-hidden rounded-xl border border-line bg-panel ${className}`}>
      <div
        className="flex flex-wrap items-center gap-1 border-b border-line bg-panel-2/80 p-1.5 sm:gap-1.5"
        role="toolbar"
        aria-label="Post formatting"
      >
        <button type="button" className={btn} title="Bold" aria-label="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => tool(() => run("bold"))}>
          <Bold className="size-4" />
        </button>
        <button type="button" className={btn} title="Italic" aria-label="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => tool(() => run("italic"))}>
          <Italic className="size-4" />
        </button>
        <button
          type="button"
          className={btn}
          title="Heading"
          aria-label="Heading"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => tool(() => run("formatBlock", "h2"))}
        >
          <Heading2 className="size-4" />
        </button>
        <button
          type="button"
          className={btn}
          title="Bullet list"
          aria-label="Bullet list"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => tool(() => run("insertUnorderedList"))}
        >
          <List className="size-4" />
        </button>
        <button
          type="button"
          className={btn}
          title="Numbered list"
          aria-label="Numbered list"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => tool(() => run("insertOrderedList"))}
        >
          <ListOrdered className="size-4" />
        </button>
        <button
          type="button"
          className={`${btn} ${linkOpen ? "border-lime-2 text-lime-2" : ""}`}
          title="Insert link"
          aria-label="Insert link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setImgOpen(false);
            setLinkOpen((v) => !v);
            setUrlDraft("");
          }}
        >
          <Link2 className="size-4" />
        </button>
        <button
          type="button"
          className={`${btn} ${imgOpen ? "border-lime-2 text-lime-2" : ""}`}
          title="Insert image"
          aria-label="Insert image"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setLinkOpen(false);
            setImgOpen((v) => !v);
            setUrlDraft("");
          }}
        >
          <ImagePlus className="size-4" />
        </button>
        <button type="button" className={btn} title="Undo" aria-label="Undo" onMouseDown={(e) => e.preventDefault()} onClick={() => tool(() => run("undo"))}>
          <Undo2 className="size-4" />
        </button>
      </div>

      {linkOpen ? (
        <div className="flex flex-col gap-2 border-b border-line bg-bg/40 p-2 sm:flex-row sm:items-center">
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://… (link URL)"
            className="min-w-0 flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-base"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
          />
          <button type="button" className="btn-join shrink-0 rounded-lg px-3 py-2 text-xs font-bold" onClick={applyLink}>
            Place link
          </button>
        </div>
      ) : null}

      {imgOpen ? (
        <div className="space-y-2 border-b border-line bg-bg/40 p-2">
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://… (image URL)"
            className="w-full rounded-lg border border-line bg-panel px-3 py-2 text-base"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyImage();
              }
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-join rounded-lg px-3 py-2 text-xs font-bold" onClick={applyImage}>
              Insert image
            </button>
            {featuredSrc ? (
              <button
                type="button"
                className="btn-3d rounded-lg px-3 py-2 text-xs font-semibold"
                onClick={() => {
                  setUrlDraft("");
                  const src = featuredSrc;
                  tool(() => {
                    document.execCommand(
                      "insertHTML",
                      false,
                      `<img src="${src.replace(/"/g, "&quot;")}" alt="Featured" />`,
                    );
                  });
                  setImgOpen(false);
                }}
              >
                Use featured image
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="relative">
        {empty ? (
          <div className="pointer-events-none absolute left-3 top-2.5 text-base text-muted/70">{placeholder}</div>
        ) : null}
        <div
          ref={ref}
          role="textbox"
          aria-multiline="true"
          aria-label="Post body"
          contentEditable
          suppressContentEditableWarning
          className="min-h-[11rem] w-full px-3 py-2.5 text-base leading-relaxed outline-none [&_a]:text-lime-2 [&_a]:underline [&_h2]:text-xl [&_h2]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_img]:my-2 [&_img]:max-h-48 [&_img]:rounded-lg"
          onInput={emit}
          onBlur={emit}
          onPaste={(e) => {
            // Prefer plain text paste to avoid huge Word/HTML junk; keep simple formatting via toolbar
            e.preventDefault();
            const text = e.clipboardData.getData("text/plain");
            document.execCommand("insertText", false, text);
            emit();
          }}
        />
      </div>
      <div className="border-t border-line px-3 py-1.5 text-[10px] text-muted">
        Bold · Italic · Heading · Lists · Link · Image · Undo — stores a small safe HTML subset
      </div>
    </div>
  );
}
