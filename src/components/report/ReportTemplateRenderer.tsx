import React from "react";
import { SharedReportPayload, ReportTemplateId } from "../../types/report";
import { ClassicLabTemplate } from "./templates/ClassicLabTemplate";
import { LuxuryGoldTemplate } from "./templates/LuxuryGoldTemplate";
import { ModernMinimalTemplate } from "./templates/ModernMinimalTemplate";
import { HallmarkOfficialTemplate } from "./templates/HallmarkOfficialTemplate";
import { CompactSlipTemplate } from "./templates/CompactSlipTemplate";
import { TechnicalSpectrumTemplate } from "./templates/TechnicalSpectrumTemplate";

interface ReportTemplateRendererProps {
  payload: SharedReportPayload;
  checksum: string;
  templateId?: ReportTemplateId;
}

export const ReportTemplateRenderer: React.FC<ReportTemplateRendererProps> = ({
  payload,
  checksum,
  templateId,
}) => {
  const activeTemplate = templateId || payload.templateId || "classic-lab";

  switch (activeTemplate) {
    case "luxury-gold":
      return <LuxuryGoldTemplate payload={payload} checksum={checksum} />;
    case "modern-minimal":
      return <ModernMinimalTemplate payload={payload} checksum={checksum} />;
    case "hallmark-official":
      return <HallmarkOfficialTemplate payload={payload} checksum={checksum} />;
    case "compact-slip":
      return <CompactSlipTemplate payload={payload} checksum={checksum} />;
    case "technical-spectrum":
      return <TechnicalSpectrumTemplate payload={payload} checksum={checksum} />;
    case "classic-lab":
    default:
      return <ClassicLabTemplate payload={payload} checksum={checksum} />;
  }
};

export default ReportTemplateRenderer;
