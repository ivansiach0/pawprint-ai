import { AuthForm } from "../auth-form";
import { connection } from "next/server";
import { localRecoveryEnabled } from "../../shared/local-recovery";

export default async function SignInPage({ searchParams }: {
  searchParams: Promise<{ reset?: string }>;
}) {
  await connection();
  const { reset } = await searchParams;
  return <AuthForm mode="sign-in" recoveryEnabled={localRecoveryEnabled()} passwordReset={reset === "success"} />;
}
