import { NavLink } from 'react-router-dom';
import styles from './TabBar.module.css';

interface Tab {
  to: string;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { to: '/', label: 'Today', icon: '◎' },
  { to: '/people', label: 'People', icon: '☰' },
  { to: '/search', label: 'Search', icon: '⌕' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export function TabBar() {
  return (
    <nav className={styles.tabbar}>
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
        >
          <span className={styles.icon} aria-hidden>
            {tab.icon}
          </span>
          <span className={styles.label}>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
