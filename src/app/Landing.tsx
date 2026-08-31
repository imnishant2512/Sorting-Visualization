import { Link } from 'react-router-dom';
import { DOMAINS } from './domains';
import styles from './Landing.module.css';

export function Landing() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1>Data structures and algorithms, one step at a time.</h1>
        <p>
          Every visualization here runs on the same replay engine: an algorithm emits discrete,
          exactly reversible steps, and the player walks a cursor through them. That is why you can
          pause anywhere, step backwards through a comparison, or change speed mid-run without
          restarting.
        </p>
      </section>

      <div className={styles.grid}>
        {DOMAINS.map((domain) => (
          <Link key={domain.path} to={domain.path} className={styles.card}>
            <span className={styles.icon} aria-hidden>
              {domain.icon}
            </span>
            <span className={styles.label}>{domain.label}</span>
            <span className={styles.blurb}>{domain.blurb}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
