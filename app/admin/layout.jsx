import './admin.css';

export const metadata = {
  title: { default: 'Administration', template: '%s | Admin Chalviraj' },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }) {
  return children;
}
