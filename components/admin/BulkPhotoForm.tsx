"use client";

import { useRef, useState } from "react";

type Car = { id: number; number: string; driver: string };

/** Envolve a grelha de fotos do admin: seleção múltipla + ações em massa. */
export function BulkPhotoForm({
  action,
  cars,
  children,
}: {
  action: (form: FormData) => Promise<void>;
  cars: Car[];
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [count, setCount] = useState(0);
  const update = () => setCount(ref.current?.querySelectorAll('input[name="ids"]:checked').length ?? 0);
  const selectAll = (on: boolean) => {
    ref.current?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((i) => (i.checked = on));
    update();
  };

  return (
    <form
      ref={ref}
      action={async (fd) => {
        await action(fd);
        selectAll(false);
      }}
      onChange={update}
      onSubmit={(e) => {
        const op = ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null)?.value;
        const car = new FormData(e.currentTarget).get("car_id");
        if (op === "delete" && !confirm(`Apagar ${count} foto(s)? Não pode ser desfeito.`)) e.preventDefault();
        if ((op === "assign" || op === "move" || op === "car-cover") && !car) {
          alert("Escolhe primeiro o carro.");
          e.preventDefault();
        }
      }}
    >
      <div className="bulk-bar card">
        <strong>{count} selecionada(s)</strong>
        <button type="button" className="link-btn" onClick={() => selectAll(true)}>
          selecionar todas
        </button>
        <button type="button" className="link-btn" onClick={() => selectAll(false)}>
          limpar
        </button>
        <select name="car_id" aria-label="Carro" defaultValue="">
          <option value="">Carro…</option>
          {cars.map((c) => (
            <option key={c.id} value={c.id}>
              #{c.number} {c.driver}
            </option>
          ))}
        </select>
        <button className="btn small" name="op" value="move" disabled={!count} title="Substitui a associação atual">
          Associar ao carro
        </button>
        <button className="btn small secondary" name="op" value="assign" disabled={!count} title="Para fotos com dois carros (batalhas)">
          + Juntar carro
        </button>
        <button className="btn small secondary" name="op" value="unassign" disabled={!count}>
          Tirar carro
        </button>
        <button className="btn small secondary" name="op" value="car-cover" disabled={count !== 1}>
          Capa do carro
        </button>
        <button className="btn small secondary" name="op" value="event-cover" disabled={count !== 1}>
          Capa do evento
        </button>
        <button className="btn small danger" name="op" value="delete" disabled={!count}>
          Apagar
        </button>
      </div>
      {children}
    </form>
  );
}
