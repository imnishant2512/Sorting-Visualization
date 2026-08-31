import { NavLink, Outlet } from 'react-router-dom';
import { DOMAINS } from './domains';
import styles from './Layout.module.css';

export function Layout() {
  return (
    <div className={styles.shell}>
      <header className={styles.nav}>
        <NavLink to="/" className={styles.brand}>
          DSA Visualizer
        </NavLink>
        <nav className={styles.links}>
          {DOMAINS.map((domain) => (
            <NavLink
              key={domain.path}
              to={domain.path}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
            >
              {domain.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
