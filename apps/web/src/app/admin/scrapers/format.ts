export function formatPrice(value: number | null, currency: string | null) {
  if (value === null) {
    return "-";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency ?? "GBP",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatActionLabel(action: "create" | "update" | "delete" | "unchanged") {
  switch (action) {
    case "create":
      return "Create";
    case "update":
      return "Update";
    case "delete":
      return "Delete";
    default:
      return "Unchanged";
  }
}

export function actionTone(action: "create" | "update" | "delete" | "unchanged") {
  switch (action) {
    case "create":
      return "bg-emerald-500/15 text-emerald-300";
    case "update":
      return "bg-amber-500/15 text-amber-300";
    case "delete":
      return "bg-red-500/15 text-red-300";
    default:
      return "bg-stone-800 text-stone-300";
  }
}
