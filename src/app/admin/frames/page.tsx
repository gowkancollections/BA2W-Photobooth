import { AdminShell } from "@/app/admin/_components/admin-shell";
import { FrameSlotTuner } from "./_components/frame-slot-tuner";

export const dynamic = "force-dynamic";

export default function AdminFramesPage() {
  return (
    <AdminShell title="Frame Slot Tuner">
      <FrameSlotTuner />
    </AdminShell>
  );
}
