import type { Metadata } from 'next';
import { Outfit, Noto_Sans_Myanmar } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const notoMyanmar = Noto_Sans_Myanmar({
  subsets: ['myanmar'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-myanmar',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sale CRM',
  description: 'Enterprise multi-branch Sale CRM',
  applicationName: '29 Shop',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '29 Shop',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="my" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('sale-crm-ui-settings')||'{}');var mode=s.themeMode||'light';var dark=mode==='dark'||(mode==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(dark)document.documentElement.classList.add('dark');var map={blue:'215 100% 54%',cyan:'188 78% 41%',green:'102 61% 43%',yellow:'40 96% 53%',orange:'28 95% 53%',red:'357 89% 55%',pink:'330 78% 55%',purple:'270 65% 50%'};var hsl=map[s.themeColor||'blue']||map.blue;document.documentElement.style.setProperty('--primary',hsl);document.documentElement.style.setProperty('--ring',hsl);}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${outfit.variable} ${notoMyanmar.variable} min-h-screen bg-background font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
