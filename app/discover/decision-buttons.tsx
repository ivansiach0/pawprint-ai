"use client";

import { useActionState } from "react";
import { primary } from "../auth.css";
import { recordDecision } from "./actions";
import * as styles from "./discover.css";

export function DecisionButtons({ petId }: { petId: number }) {
  const [error, submit, pending] = useActionState(recordDecision.bind(null, petId), "");

  return (
    <form action={submit}>
      <div className={styles.actions}>
        <button className={styles.secondaryButton} name="choice" value="pass" disabled={pending}>Pass</button>
        <button className={primary} name="choice" value="save" disabled={pending}>Save</button>
      </div>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
