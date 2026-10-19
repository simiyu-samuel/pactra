import type { ComponentProps } from 'react';
export const cn = (...values: unknown[]) => values.filter(Boolean).join(' ');
export function Badge({ variant: _variant, ...props }: ComponentProps<'span'> & { variant?: string }) { return <span data-slot="badge" {...props}/>; }
export function Skeleton(props: ComponentProps<'div'>) { return <div data-slot="skeleton" {...props}/>; }
