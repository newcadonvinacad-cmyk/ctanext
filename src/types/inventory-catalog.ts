export interface CatalogLookup { id: string; code: string; name: string; dimension?: string }
export interface CatalogItem {
  id: string; code: string; name: string; kind: "material" | "product" | "tool" | "service";
  categoryId: string; categoryName: string; baseUnitId: string; baseUnitName: string;
  specJson: Record<string, unknown>; isActive: boolean;
  conversions: { unitId: string; unitName: string; factorToBase: number }[];
}
