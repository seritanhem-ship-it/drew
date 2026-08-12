import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const loanApplications = sqliteTable("loan_applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: text("application_id").notNull().unique(),
  referenceId: text("reference_id").notNull().unique(),
  fullName: text("full_name").notNull(), phone: text("phone").notNull(), email: text("email"),
  loanProduct: text("loan_product").notNull(), requestedAmount: integer("requested_amount").notNull(),
  repaymentPeriod: integer("repayment_period").notNull(), purpose: text("purpose").notNull(),
  status: text("status").notNull().default("SUBMITTED"), membershipId: text("membership_id"),
});
