import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { EditProfileDialog } from "./EditProfileDialog";
import { ProfileAvatar } from "./ProfileAvatar";

// Profile area at the bottom of the sidebar. Clicking it opens the "Edit profil" modal directly
// (no dropdown). Used by the desktop sidebar (expanded or icon rail) and the mobile drawer; every
// instance reads the same module store so they always show the same profile. The modal is
// portalled to document.body by EditProfileDialog, so no sidebar/drawer ancestor can clip it.
export function ProfileButton({ collapsed = false }: { collapsed?: boolean }) {
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openDialog = () => {
    // Focus the trigger first (some browsers don't focus buttons on click) so the dialog
    // captures it as the opener and restores focus to it on close.
    triggerRef.current?.focus();
    setOpen(true);
  };

  return (
    <>
      <div className="mt-auto">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-label={`Edit profil, ${profile.name}`}
          title={collapsed ? `${profile.name} · ${profile.kitchen}` : undefined}
          onClick={openDialog}
          className={
            collapsed
              ? "mx-auto grid h-11 w-11 place-items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              : "flex w-full items-center gap-3 rounded-2xl bg-card/60 p-3 text-left transition-colors hover:bg-card/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          }
        >
          <ProfileAvatar name={profile.name} avatar={profile.avatar} className="h-11 w-11" />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{profile.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{profile.kitchen}</span>
              </span>
              <Pencil aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </button>
      </div>
      <EditProfileDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
