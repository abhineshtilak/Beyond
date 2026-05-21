import {
  Sparkles, Dumbbell, BookOpen, Brain, GlassWater, Moon, Sun, Heart,
  PenLine, Leaf, Apple, Footprints, Music, Coffee, Code, Mountain,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { HabitIconKey } from './types';

export const HABIT_ICONS: Record<HabitIconKey, LucideIcon> = {
  sparkles: Sparkles,
  dumbbell: Dumbbell,
  'book-open': BookOpen,
  brain: Brain,
  'glass-water': GlassWater,
  moon: Moon,
  sun: Sun,
  heart: Heart,
  'pen-line': PenLine,
  leaf: Leaf,
  apple: Apple,
  footprints: Footprints,
  music: Music,
  coffee: Coffee,
  code: Code,
  mountain: Mountain,
};
