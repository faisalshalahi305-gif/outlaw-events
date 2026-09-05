import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Loader2, Send, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { submitSuggestion } from "@/lib/suggestions.functions";

const MAX_IMAGES = 4;
const MAX_BYTES = 4 * 1024 * 1024;

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visitorNumber?: number | null;
};

export function SuggestionsDialog({ open, onOpenChange, visitorNumber }: Props) {
  const send = useServerFn(submitSuggestion);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    const room = MAX_IMAGES - images.length;
    const picked = Array.from(files).slice(0, Math.max(room, 0));
    const next: string[] = [];
    for (const file of picked) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_BYTES) {
        setError("حجم الصورة يجب أن يكون أقل من 4 ميجابايت");
        continue;
      }
      next.push(await readAsDataUrl(file));
    }
    setImages((prev) => [...prev, ...next].slice(0, MAX_IMAGES));
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async () => {
    setError("");
    setMsg("");
    if (!name.trim() || !title.trim() || !body.trim()) {
      setError("الرجاء تعبئة الاسم والعنوان والنص");
      return;
    }
    setSending(true);
    try {
      await send({
        data: {
          name: name.trim(),
          title: title.trim(),
          body: body.trim(),
          images,
          visitorNumber: visitorNumber ?? null,
        },
      });
      setMsg("تم إرسال اقتراحك، سيتم مراجعته وقبوله أو رفضه قريباً");
      setName("");
      setTitle("");
      setBody("");
      setImages([]);
    } catch {
      setError("تعذر إرسال الاقتراح، حاول مرة أخرى");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="surface-card max-h-[88vh] overflow-y-auto rounded-2xl border-primary/40 sm:max-w-md"
      >
        <DialogHeader className="text-right">
          <DialogTitle className="text-xl font-extrabold text-primary">
            الاقتراحات
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            شاركنا اقتراحك مع إمكانية إرفاق حتى {MAX_IMAGES} صور
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-right">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">الاسم</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="اسم صاحب الاقتراح"
              className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">العنوان</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="عنوان الاقتراح"
              className="w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-foreground">النص</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={4000}
              rows={5}
              placeholder="تفاصيل الاقتراح"
              className="w-full resize-y rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </label>

          <div className="space-y-2">
            <span className="text-xs font-bold text-foreground">
              الصور ({images.length}/{MAX_IMAGES})
            </span>
            <div className="flex flex-wrap gap-2">
              {images.map((src, i) => (
                <div
                  key={i}
                  className="relative h-20 w-20 overflow-hidden rounded-xl border border-primary/40"
                >
                  <img src={src} alt={`صورة ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    aria-label="حذف الصورة"
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute left-1 top-1 rounded-full bg-background/80 p-1 text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {images.length < MAX_IMAGES ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-primary/50 text-[10px] font-bold text-primary"
                >
                  <ImagePlus className="h-4 w-4" />
                  إضافة صورة
                </button>
              ) : null}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => pick(e.target.files)}
              className="hidden"
            />
          </div>

          {error ? <p className="text-xs font-bold text-destructive">{error}</p> : null}
          {msg ? <p className="text-xs font-bold text-primary">{msg}</p> : null}

          <button
            type="button"
            onClick={submit}
            disabled={sending}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/60 bg-primary/10 px-5 py-3 text-sm font-extrabold text-primary transition-all hover:border-primary disabled:opacity-60"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            إرسال
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
