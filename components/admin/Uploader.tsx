"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const PARALLEL = 3;

export function Uploader({ eventId }: { eventId: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function upload(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) return;
    setErrors([]);
    setProgress({ done: 0, total: images.length });
    let done = 0;
    const queue = [...images];
    const worker = async () => {
      while (queue.length) {
        const file = queue.shift()!;
        const body = new FormData();
        body.set("eventId", String(eventId));
        body.set("file", file);
        try {
          const res = await fetch("/api/admin/photos", { method: "POST", body });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setErrors((e) => [...e, data.error ?? `${file.name}: erro ${res.status}`]);
          }
        } catch {
          setErrors((e) => [...e, `${file.name}: falha de rede`]);
        }
        done++;
        setProgress({ done, total: images.length });
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
    router.refresh();
    setTimeout(() => setProgress(null), 1500);
  }

  return (
    <div
      className={`dropzone ${over ? "over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        upload([...e.dataTransfer.files]);
      }}
    >
      <p style={{ margin: "0 0 10px" }}>Arraste as fotografias para aqui ou</p>
      <button type="button" className="btn secondary" onClick={() => input.current?.click()} disabled={!!progress}>
        Escolher ficheiros
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/tiff"
        multiple
        hidden
        onChange={(e) => {
          upload([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <p className="hint" style={{ marginBottom: 0 }}>
        Carregue os originais em alta resolução — o site cria automaticamente as pré-visualizações com marca de água.
        Dica: dorsais no nome do ficheiro (ex.: <code>IMG_0042_d123.jpg</code>) são identificados automaticamente.
      </p>
      {progress && (
        <>
          <div className="progress">
            <div style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          <p className="hint">
            {progress.done} / {progress.total} fotografias
          </p>
        </>
      )}
      {errors.length > 0 && (
        <ul className="error" style={{ textAlign: "left" }}>
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
