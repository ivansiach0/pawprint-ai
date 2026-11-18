import { connection } from "next/server";
import { notFound } from "next/navigation";
import { localRecoveryEnabled } from "../../shared/local-recovery";
import { ResetPasswordForm } from "../recovery-form";

export default async function ResetPasswordPage() {
  await connection();
  if (!localRecoveryEnabled()) notFound();
  return <ResetPasswordForm />;
}
