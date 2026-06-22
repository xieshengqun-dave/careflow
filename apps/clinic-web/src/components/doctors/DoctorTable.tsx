"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DoctorDialog, type DoctorFormData } from "./DoctorDialog";
import { deleteDoctor } from "@/lib/actions/doctors";
import { MoreHorizontal, UserPlus } from "lucide-react";

export interface Doctor {
  id: string;
  specialization: string | null;
  consultation_duration_minutes: number;
  staff: { full_name: string; email: string | null; is_active: boolean } | null;
}

export function DoctorTable({ doctors, canManage }: { doctors: Doctor[]; canManage: boolean }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DoctorFormData | undefined>();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openAdd = () => { setEditTarget(undefined); setDialogOpen(true); };
  const openEdit = (doc: Doctor) => {
    setEditTarget({
      id: doc.id,
      fullName: doc.staff?.full_name ?? "",
      email: doc.staff?.email ?? "",
      specialization: doc.specialization ?? "",
      consultationDuration: doc.consultation_duration_minutes,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Remove ${name} from this clinic?`)) return;
    setDeletingId(id);
    startTransition(async () => { await deleteDoctor(id); setDeletingId(null); });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Doctors</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {doctors.length} doctor{doctors.length !== 1 ? "s" : ""} in your clinic
          </p>
        </div>
        {canManage && (
          <Button onClick={openAdd} className="gap-2">
            <UserPlus className="h-4 w-4" /> Add Doctor
          </Button>
        )}
      </div>

      {doctors.length === 0 ? (
        <div className="rounded-xl border border-dashed p-16 text-center bg-white">
          <p className="text-muted-foreground text-sm">No doctors yet.</p>
          {canManage && (
            <Button className="mt-4 gap-2" onClick={openAdd}>
              <UserPlus className="h-4 w-4" /> Add first doctor
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead>Doctor</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((doc) => (
                <TableRow key={doc.id} className={deletingId === doc.id ? "opacity-40 pointer-events-none" : ""}>
                  <TableCell>
                    <p className="font-medium">{doc.staff?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{doc.staff?.email ?? "—"}</p>
                  </TableCell>
                  <TableCell className="text-sm">{doc.specialization ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-sm">{doc.consultation_duration_minutes} min</TableCell>
                  <TableCell>
                    <Badge variant={doc.staff?.is_active ? "default" : "secondary"} className="text-xs">
                      {doc.staff?.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(doc)}>Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(doc.id, doc.staff?.full_name ?? "this doctor")}
                            disabled={isPending}
                          >
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {canManage && (
        <DoctorDialog open={dialogOpen} onClose={() => setDialogOpen(false)} initial={editTarget} />
      )}
    </>
  );
}
