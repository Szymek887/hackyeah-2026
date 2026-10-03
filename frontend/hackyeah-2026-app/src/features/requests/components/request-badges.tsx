import type { Category, Priority } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { CategoryColors, PriorityColors } from '@/constants/theme';
import { CategoryLabels, PriorityLabels } from '@/features/requests/labels';

export function CategoryBadge({ category }: { category: Category }) {
  const { color, soft } = CategoryColors[category];
  return <Badge label={CategoryLabels[category]} color={color} backgroundColor={soft} />;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { color, soft } = PriorityColors[priority];
  return <Badge dot label={PriorityLabels[priority]} color={color} backgroundColor={soft} />;
}
