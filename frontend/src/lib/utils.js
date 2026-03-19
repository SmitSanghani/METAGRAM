import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const readFileAsDataURL = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
    }
    reader.readAsDataURL(file);
  });
}

export const getAvatarColor = (name) => {
  if (!name) return "bg-gray-100 text-gray-400";
  const colors = [
    "bg-red-500 text-white",
    "bg-blue-600 text-white",
    "bg-emerald-600 text-white",
    "bg-amber-600 text-white",
    "bg-purple-600 text-white",
    "bg-rose-600 text-white",
    "bg-indigo-600 text-white",
    "bg-orange-600 text-white",
    "bg-teal-600 text-white",
    "bg-cyan-600 text-white",
    "bg-fuchsia-600 text-white",
    "bg-violet-600 text-white",
    "bg-sky-600 text-white",
    "bg-lime-600 text-white"
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};