"use client";

/**
 * Recent weigh-ins and calorie entries on the Log page, with inline Edit
 * and Delete. After a delete, an Undo message re-saves the same values as
 * a new entry. The message stays until your next save, edit, or delete.
 */

import { useActionState, useState, useTransition } from "react";
import { deleteEntry, editCalorieEntry, editWeighIn, undoDelete } from "@/app/log/actions";
import { initialEditFormState, type DeletedEntry, type EditFormState } from "@/app/log/form-state";
import { formatDate } from "@/lib/dates";
import { displayWeight, type UnitSystem } from "@/lib/units";
import { useLocalToday } from "./use-local-today";

type Kind = "weighIn" | "calories";

interface Props {
  weighIns: { id: number; date: string; weightKg: number }[];
  calorieEntries: { id: number; date: string; calories: number }[];
  unitSystem: UnitSystem;
  birthdate: string;
}

const inputClass = "rounded border border-line px-2 py-1";
const smallButton = "rounded border border-line px-2 py-1 text-sm";

function showWeight(kg: number, unitSystem: UnitSystem) {
  const w = displayWeight(kg, unitSystem);
  return `${w.value.toFixed(1)} ${w.unit}`;
}

function describe(entry: DeletedEntry, unitSystem: UnitSystem) {
  const value =
    entry.kind === "weighIn" ? showWeight(entry.weightKg, unitSystem) : `${entry.calories.toLocaleString("en-US")} calories`;
  return `${value} from ${formatDate(entry.date)}`;
}

/** Highest id in a list (lists are newest-saved first). */
const newestId = (list: { id: number }[]) => list[0]?.id ?? 0;

export function RecentEntries({ weighIns, calorieEntries, unitSystem, birthdate }: Props) {
  const [editing, setEditing] = useState<{ kind: Kind; id: number } | null>(null);
  const [undo, setUndo] = useState<{ entry: DeletedEntry; newestAtDelete: number[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  // A new save from the forms above adds a higher id; that counts as "your
  // next action", so the Undo message is no longer offered.
  const newestNow = [newestId(weighIns), newestId(calorieEntries)];
  const undoStillValid = undo && newestNow.every((id, i) => id <= undo.newestAtDelete[i]);

  function remove(kind: Kind, id: number) {
    setError(null);
    setEditing(null);
    const before = newestNow;
    startTransition(async () => {
      const result = await deleteEntry(kind, String(id));
      if (result.deleted) setUndo({ entry: result.deleted, newestAtDelete: before });
      else {
        setUndo(null);
        setError(result.error ?? "Couldn't delete that entry.");
      }
    });
  }

  function restore() {
    if (!undo) return;
    const entry = undo.entry;
    setError(null);
    startTransition(async () => {
      const result = await undoDelete(entry);
      setUndo(null);
      if (result.error) setError(result.error);
    });
  }

  function startEdit(kind: Kind, id: number) {
    setUndo(null); // editing is your next action
    setError(null);
    setEditing({ kind, id });
  }

  const isEditing = (kind: Kind, id: number) => editing?.kind === kind && editing.id === id;

  return (
    <section className="flex flex-col gap-4">
      {undoStillValid && (
        <p role="status" className="flex flex-wrap items-center gap-2 rounded border border-line p-2 text-sm">
          Deleted {describe(undo.entry, unitSystem)}.
          <button type="button" onClick={restore} disabled={busy} className={`${smallButton} font-medium`}>
            Undo
          </button>
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <EntryList title="Recent weigh-ins" empty="No weigh-ins yet.">
        {weighIns.map((w) =>
          isEditing("weighIn", w.id) ? (
            <EditRow
              key={w.id}
              action={editWeighIn}
              id={w.id}
              date={w.date}
              birthdate={birthdate}
              valueField={{ name: "weight", label: `Weight (${unitSystem === "metric" ? "kg" : "lb"})`, value: displayWeight(w.weightKg, unitSystem).value.toFixed(1), step: "any" }}
              onDone={() => setEditing(null)}
            />
          ) : (
            <Row
              key={w.id}
              date={w.date}
              value={showWeight(w.weightKg, unitSystem)}
              busy={busy}
              onEdit={() => startEdit("weighIn", w.id)}
              onDelete={() => remove("weighIn", w.id)}
            />
          ),
        )}
      </EntryList>

      <EntryList title="Recent calories" empty="No calorie entries yet.">
        {calorieEntries.map((c) =>
          isEditing("calories", c.id) ? (
            <EditRow
              key={c.id}
              action={editCalorieEntry}
              id={c.id}
              date={c.date}
              birthdate={birthdate}
              valueField={{ name: "calories", label: "Calories", value: String(c.calories), step: "1" }}
              onDone={() => setEditing(null)}
            />
          ) : (
            <Row
              key={c.id}
              date={c.date}
              value={`${c.calories.toLocaleString("en-US")} cal`}
              busy={busy}
              onEdit={() => startEdit("calories", c.id)}
              onDelete={() => remove("calories", c.id)}
            />
          ),
        )}
      </EntryList>
    </section>
  );
}

function EntryList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col">{children}</ul>
      )}
    </div>
  );
}

function Row(props: { date: string; value: string; busy: boolean; onEdit: () => void; onDelete: () => void }) {
  return (
    <li className="flex items-center gap-2 border-b border-line py-2 text-sm">
      <span className="flex-1">{formatDate(props.date)}</span>
      <span className="tabular-nums">{props.value}</span>
      <button type="button" onClick={props.onEdit} className={smallButton}>
        Edit
      </button>
      <button type="button" onClick={props.onDelete} disabled={props.busy} className={smallButton}>
        Delete
      </button>
    </li>
  );
}

interface EditRowProps {
  action: (prev: EditFormState, formData: FormData) => Promise<EditFormState>;
  id: number;
  date: string;
  birthdate: string;
  valueField: { name: string; label: string; value: string; step: string };
  onDone: () => void;
}

function EditRow({ action, id, date, birthdate, valueField, onDone }: EditRowProps) {
  const today = useLocalToday();
  // Controlled inputs: a failed save keeps what you typed.
  const [dateText, setDateText] = useState(date);
  const [valueText, setValueText] = useState(valueField.value);
  // Close the editor as soon as the save succeeds.
  const [state, formAction, pending] = useActionState(async (prev: EditFormState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.ok) onDone();
    return result;
  }, initialEditFormState);

  return (
    <li className="border-b border-line py-2">
      <form action={formAction} className="flex flex-col gap-2 text-sm">
        <input type="hidden" name="id" value={id} />
        {/* Tells the server to keep the stored weight exactly (no rounding drift). */}
        {valueField.name === "weight" && valueText === valueField.value && (
          <input type="hidden" name="weightUnchanged" value="1" />
        )}
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-col gap-1">
            <span className="font-medium">Date</span>
            <input
              name="date"
              type="date"
              required
              value={dateText}
              onChange={(e) => setDateText(e.target.value)}
              min={birthdate}
              max={today || undefined}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-medium">{valueField.label}</span>
            <input
              name={valueField.name}
              type="number"
              inputMode="decimal"
              step={valueField.step}
              min="0"
              required
              value={valueText}
              onChange={(e) => setValueText(e.target.value)}
              className={`${inputClass} w-28`}
            />
          </label>
        </div>
        {Object.values(state.fieldErrors ?? {}).map((message) => (
          <span key={message} className="text-danger">
            {message}
          </span>
        ))}
        {state.error && (
          <span role="alert" className="text-danger">
            {state.error}
          </span>
        )}
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="rounded bg-foreground px-3 py-1 font-medium text-background disabled:opacity-50">
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onDone} className={smallButton}>
            Cancel
          </button>
        </div>
      </form>
    </li>
  );
}
