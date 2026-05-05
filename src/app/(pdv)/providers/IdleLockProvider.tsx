"use client";

import { IdleLockScreen } from "@/components/IdleLockScreen";

export function IdleLockProvider({
  children,
  nomeLoja,
}: {
  children: React.ReactNode;
  nomeLoja?: string;
}) {
  return (
    <>
      {children}
      <IdleLockScreen nomeLoja={nomeLoja} />
    </>
  );
}
