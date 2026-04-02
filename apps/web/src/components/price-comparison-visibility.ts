export interface ColumnVisibility {
  showServing: boolean;   // protein /Serving, calories /Serving, price /Serving
  show100g: boolean;      // protein /100g, calories /100g, price /100g
  show1gProtein: boolean; // calories /1g Protein, price /1g Protein
  showTotal: boolean;     // price Total
}

export const DEFAULT_VISIBILITY: ColumnVisibility = {
  showServing: true,
  show100g: true,
  show1gProtein: true,
  showTotal: true,
};
