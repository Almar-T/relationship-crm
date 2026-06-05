import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { TabBar } from './TabBar';
import styles from './AppShell.module.css';

/** Routes where the bottom tab bar + add button are shown. */
const ROOT_ROUTES = ['/', '/people', '/search', '/settings'];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const isRoot = ROOT_ROUTES.includes(location.pathname);
  const showAdd = location.pathname === '/' || location.pathname === '/people';

  return (
    <div className={styles.shell}>
      <main className={`${styles.content} ${isRoot ? styles.withTabbar : ''}`}>
        <Outlet />
      </main>

      {showAdd && (
        <button className={styles.fab} onClick={() => navigate('/add')} aria-label="Add person">
          +
        </button>
      )}

      {isRoot && <TabBar />}
    </div>
  );
}
