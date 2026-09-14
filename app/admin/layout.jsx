import './admin.css';

export const metadata = {
  title: { default: 'Administration', template: '%s | Admin Mofwazé' },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return children;
}
