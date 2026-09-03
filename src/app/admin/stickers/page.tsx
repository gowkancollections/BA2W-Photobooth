import { AdminShell } from "@/app/admin/_components/admin-shell";
import { StickerManager } from "./_components/sticker-manager";

export const dynamic = "force-dynamic";

export default function AdminStickersPage() {
  return (
    <AdminShell title="Sticker Manager">
      <StickerManager />
    </AdminShell>
  );
}
