import { Apple, Carrot, ChefHat, Leaf, Salad, Sprout, type LucideIcon } from "lucide-react";
import { avatarInitial, type Avatar, type PresetAvatarId } from "@/lib/profile";

export const PRESET_ICONS: Record<PresetAvatarId, LucideIcon> = {
  leaf: Leaf,
  sprout: Sprout,
  carrot: Carrot,
  apple: Apple,
  "chef-hat": ChefHat,
  salad: Salad,
};

// Decorative: the accessible name is provided by the button/radio that contains it.
export function ProfileAvatar({
  name,
  avatar,
  className = "h-11 w-11",
}: {
  name: string;
  avatar: Avatar;
  className?: string;
}) {
  if (avatar.kind === "photo") {
    return <img src={avatar.dataUrl} alt="" aria-hidden="true" className={`${className} shrink-0 rounded-full bg-card object-cover`} />;
  }
  if (avatar.kind === "preset") {
    const Icon = PRESET_ICONS[avatar.id];
    return (
      <span aria-hidden="true" className={`${className} grid shrink-0 place-items-center rounded-full bg-mint text-primary`}>
        <Icon className="h-1/2 w-1/2" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={`${className} grid shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground`}>
      {avatarInitial(name)}
    </span>
  );
}
