"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  upsertTreatmentTemplate,
  deleteTreatmentTemplate,
  type TreatmentTemplate,
} from "@/lib/actions/treatments";

interface Props {
  templates: TreatmentTemplate[];
}

interface EditState {
  id?: string;
  name: string;
  durationMinutes: number;
}

export function TreatmentTemplates({ templates: initial }: Props) {
  const [templates, setTemplates] = useState(initial);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function startAdd() {
    setEditing({ name: "", durationMinutes: 30 });
    setError(null);
  }

  function startEdit(t: TreatmentTemplate) {
    setEditing({ id: t.id, name: t.name, durationMinutes: t.durationMinutes });
    setError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setError(null);
  }

  function handleSave() {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) { setError("Name is required."); return; }
    if (editing.durationMinutes < 1 || editing.durationMinutes > 480) {
      setError("Duration must be between 1 and 480 minutes.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await upsertTreatmentTemplate({
        id: editing.id,
        name,
        durationMinutes: editing.durationMinutes,
      });
      if (result.error) { setError(result.error); return; }

      // Optimistic update
      setTemplates((prev) => {
        if (editing.id) {
          return prev.map((t) =>
            t.id === editing.id ? { ...t, name, durationMinutes: editing.durationMinutes, isClinicSpecific: true } : t
          );
        }
        // New entry — append (will get real id on next server render)
        return [...prev, { id: `tmp-${Date.now()}`, name, durationMinutes: editing.durationMinutes, isClinicSpecific: true }];
      });
      setEditing(null);
    });
  }

  function handleDelete(t: TreatmentTemplate) {
    if (!t.isClinicSpecific) return; // shouldn't happen — button not shown for global defaults
    startTransition(async () => {
      const result = await deleteTreatmentTemplate(t.id);
      if (result.error) { setError(result.error); return; }
      setTemplates((prev) => prev.filter((x) => x.id !== t.id));
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Treatment Templates</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set default durations for each treatment type. Receptionists see these when booking.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={startAdd} disabled={!!editing}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium text-slate-600 text-xs">Treatment</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-600 text-xs">Duration</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-600 text-xs">Source</th>
              <th className="px-4 py-2.5 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {templates.map((t) => (
              <tr key={t.id} className="bg-white hover:bg-slate-50/50 transition-colors">
                {editing?.id === t.id ? (
                  <>
                    <td className="px-3 py-2">
                      <Input
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        className="h-7 text-sm"
                        autoFocus
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={1}
                          max={480}
                          value={editing.durationMinutes}
                          onChange={(e) => setEditing({ ...editing, durationMinutes: Number(e.target.value) })}
                          className="h-7 text-sm w-20"
                        />
                        <span className="text-xs text-slate-400">min</span>
                      </div>
                    </td>
                    <td className="px-4 py-2" />
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Button size="sm" className="h-7 w-7 p-0" onClick={handleSave} disabled={isPending}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelEdit}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-slate-900">{t.name}</td>
                    <td className="px-4 py-3 text-slate-600">{t.durationMinutes} min</td>
                    <td className="px-4 py-3">
                      {t.isClinicSpecific ? (
                        <span className="inline-flex items-center rounded-full bg-cf-primary-50 text-cf-primary-700 text-[10px] font-semibold px-2 py-0.5">
                          Custom
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium px-2 py-0.5">
                          Default
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="sm" variant="ghost"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                          onClick={() => startEdit(t)}
                          disabled={!!editing}
                          title="Edit duration"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {t.isClinicSpecific && (
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                            onClick={() => handleDelete(t)}
                            disabled={isPending || !!editing}
                            title="Remove custom duration (reverts to default)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {/* New entry row */}
            {editing && !editing.id && (
              <tr className="bg-cf-primary-50/30">
                <td className="px-3 py-2">
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="Treatment name"
                    className="h-7 text-sm"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") cancelEdit(); }}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      max={480}
                      value={editing.durationMinutes}
                      onChange={(e) => setEditing({ ...editing, durationMinutes: Number(e.target.value) })}
                      className="h-7 text-sm w-20"
                    />
                    <span className="text-xs text-slate-400">min</span>
                  </div>
                </td>
                <td className="px-4 py-2" />
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Button size="sm" className="h-7 w-7 p-0" onClick={handleSave} disabled={isPending}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={cancelEdit}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {templates.length === 0 && !editing && (
          <div className="py-8 text-center text-sm text-slate-400">
            No templates yet. Add one to get started.
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400">
        Default durations are set by CareFlow. Edit any row to set a custom duration for your clinic.
        Deleting a custom duration reverts to the default.
      </p>
    </div>
  );
}
