import Image from "next/image";
import type { Pet } from "./catalog-api";
import * as styles from "./discover/discover.css";

export function PetCard({ pet, featured = false }: { pet: Pet; featured?: boolean }) {
  return (
    <article className={styles.card}>
      <Image
        className={styles.photo}
        src={pet.imageUrl}
        alt={pet.name}
        fill
        preload={featured}
        sizes={featured
          ? "(max-width: 532px) calc(100vw - 32px), 500px"
          : "(max-width: 540px) calc(100vw - 32px), 290px"}
      />
      <div className={styles.details}>
        <h2 className={styles.name}>{pet.name}</h2>
        <p className={styles.description}>
          {pet.species} · {pet.age} {pet.age === 1 ? "year" : "years"} old
        </p>
      </div>
    </article>
  );
}
