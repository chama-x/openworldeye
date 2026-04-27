import { resolveAircraftVisual } from "@/lib/aircraft-classifier";
import { A320Model } from "@/components/models/A320Model";
import { ATR72Model } from "@/components/models/ATR72Model";
import { Boeing737Model } from "@/components/models/Boeing737Model";
import { Boeing777Model } from "@/components/models/Boeing777Model";
import { EmbraerE190Model } from "@/components/models/EmbraerE190Model";
import { GenericAircraftModel } from "@/components/models/GenericAircraftModel";

export interface AircraftModelPickerProps {
  typeCode?: string;
  scale?: number;
}

/** Same rules as instanced globe buckets — panel preview stays in sync. */
export function AircraftModelPicker({ typeCode, scale = 1 }: AircraftModelPickerProps) {
  const v = resolveAircraftVisual({ typeCode });
  const finalScale = scale * v.categoryScale;

  switch (v.specificModel) {
    case "b777":
      return <Boeing777Model scale={finalScale} />;
    case "b737":
      return <Boeing737Model scale={finalScale} />;
    case "a320":
      return <A320Model scale={finalScale} />;
    case "atr72":
      return <ATR72Model scale={finalScale} />;
    case "e190":
      return <EmbraerE190Model scale={finalScale} />;
    default:
      return <GenericAircraftModel scale={finalScale} color={v.silhouetteColor} />;
  }
}
