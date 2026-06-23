import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Conditional + conflict-free Tailwind class merge. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
