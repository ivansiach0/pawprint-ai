import Image from "next/image";
import dogPhoto from "../public/images/landing-dog.jpg";
import * as styles from "./landing.css";

export default function Home() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.wordmark}>Pawprint</span>
      </header>
      <main className={styles.hero}>
        <div className={styles.intro}>
          <h1 className={styles.title}>
            Find a pet <em className={styles.accent}>to love.</em>
          </h1>
          <p className={styles.description}>
            Discover pets and save your favorites in one place.
          </p>
        </div>
        <div className={styles.photoFrame}>
          <Image
            className={styles.photo}
            src={dogPhoto}
            alt="A tan dog looking up on a wooded trail"
            fill
            preload
            sizes="(min-width: 1184px) 600px, (min-width: 801px) 53vw, 100vw"
          />
        </div>
      </main>
    </div>
  );
}
