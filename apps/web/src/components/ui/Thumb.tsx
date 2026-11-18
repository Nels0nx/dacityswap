import Image from 'next/image';
import { thumbnailOf } from '@/domain/models';
import type { ModelId } from '@/domain/types';
import { cn } from '@/lib/cn';

/** A render of the product's 3D model. Pass the tile's size through `className`. */
export function Thumb({ model, className }: { model: ModelId; className?: string }) {
  return (
    <span className={cn('thumb-tile block', className)}>
      <Image
        src={thumbnailOf(model)}
        alt=""
        fill
        sizes="320px"
        unoptimized
        className="object-contain p-1"
      />
    </span>
  );
}
