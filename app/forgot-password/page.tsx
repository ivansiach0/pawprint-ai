import { connection } from "next/server";
import { notFound } from "next/navigation";
import { localRecoveryEnabled } from "../../shared/local-recovery";
import { ForgotPasswordForm } from "../recovery-form";

export default async function ForgotPasswordPage() {
  await connection();
  if (!localRecoveryEnabled()) notFound();
  return <ForgotPasswordForm />;
}
