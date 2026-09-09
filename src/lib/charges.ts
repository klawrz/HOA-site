import { UnitChargeType, AssessmentSplit } from "@/generated/prisma"

export const UNIT_CHARGE_TYPE_LABEL: Record<UnitChargeType, string> = {
  WATER: "Water",
  FEE: "Fee",
  OTHER: "Other",
}

export const UNIT_CHARGE_TYPES: UnitChargeType[] = ["WATER", "FEE", "OTHER"]

export const ASSESSMENT_SPLIT_LABEL: Record<AssessmentSplit, string> = {
  EVEN: "Evenly across all units",
  PERCENT: "By each unit's allocation %",
}

export const ASSESSMENT_SPLITS: AssessmentSplit[] = ["EVEN", "PERCENT"]
