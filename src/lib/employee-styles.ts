export const employeeStatusLabel: Record<string, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On Leave",
  FORMER: "Former",
}

export const employeeStatusColor: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  ON_LEAVE: "bg-amber-100 text-amber-800",
  FORMER: "bg-gray-100 text-gray-600",
}

// The "government program numbers" pull-down - Mexico-first, mirrors the
// EmployeeGovIdType enum. OTHER carries a free-text label alongside it.
export const employeeGovIdTypeLabel: Record<string, string> = {
  IMSS: "IMSS (Social Security)",
  CURP: "CURP",
  RFC: "RFC (Tax ID)",
  INFONAVIT: "INFONAVIT",
  SAR_AFORE: "SAR / AFORE",
  FONACOT: "FONACOT",
  OTHER: "Other",
}

export const EMPLOYEE_GOV_ID_TYPES = [
  "IMSS",
  "CURP",
  "RFC",
  "INFONAVIT",
  "SAR_AFORE",
  "FONACOT",
  "OTHER",
] as const
