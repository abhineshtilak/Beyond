import { format, parseISO } from 'date-fns';

export const ymd = (d: Date = new Date()) => format(d, 'yyyy-MM-dd');
export const greet = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
};
export const prettyDate = (d: Date = new Date()) => format(d, 'EEEE, MMMM d');
export { format, parseISO };
