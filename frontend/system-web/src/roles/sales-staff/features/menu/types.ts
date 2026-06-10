export type CategoryId = string;
export type SizeKey = string;

export interface Category {
  id: CategoryId;
  label: string;
  icon: string;
}

export interface Product {
  id: string;
  numericId?: number;
  name: string;
  price: number;
  category: string;
  productType?: string;
  emoji?: string;
  image?: string;
  available: boolean;
  sizes: Partial<Record<SizeKey, number>>;
  sizeIds?: Partial<Record<SizeKey, string>>;
  availableToppingIds?: string[];
  allowCustomizations?: boolean;
}

export interface Topping {
  id: string;
  numericId?: number;
  name: string;
  price: number;
}
