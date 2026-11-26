import type { z } from "zod";
import {
  BuildReportSchema,
  ColdReadReportSchema,
  CycleAuditReportSchema,
  CycleCriticReportSchema,
  DoctrineReviewReportSchema,
  FixReportSchema,
  GoAuditReportSchema,
  GoCriticReportSchema,
  ReviewReportSchema,
} from "../../contracts/src/report-schemas.ts";
import {
  DesignReportSchema,
  HunterReportSchema,
  SlopAuditSchema,
  VerifyReportSchema,
} from "../../slop-ctl/src/schemas.ts";

export const REPORT_SCHEMAS: Readonly<Record<string, z.ZodType>> = {
  ColdReadReportSchema,
  BuildReportSchema,
  GoCriticReportSchema,
  GoAuditReportSchema,
  ReviewReportSchema,
  DoctrineReviewReportSchema,
  FixReportSchema,
  CycleCriticReportSchema,
  CycleAuditReportSchema,
  DesignReportSchema,
  HunterReportSchema,
  VerifyReportSchema,
  SlopAuditSchema,
};
