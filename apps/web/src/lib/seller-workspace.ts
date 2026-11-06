import type { OwnerListing } from '../components/seller-product-form';

export type WorkspaceVersion = { id: string; version: number; note: string; createdAt: string; snapshot: { seller: { strategy: string; standardCents: number; standardDays: number; expressCents: number; expressDays: number; warrantyMonths: number }; listings: Array<{ id: string; onHand: number; floorCents: number; product?: { name: string } }> } };
export type WorkspaceSeller = { id: string; name: string; strategy: string; privateInstructions: string; policyVersion: number; warrantyMonths: number; standardCents: number; standardDays: number; expressCents: number; expressDays: number; listings: OwnerListing[]; policyVersions: WorkspaceVersion[] };
