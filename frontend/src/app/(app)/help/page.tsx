'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  Store,
  Package,
  ShoppingBag,
  Settings,
  UserRound,
  QrCode,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Step = { title: string; body: string };

type Section = {
  id: string;
  title: string;
  icon: typeof BookOpen;
  intro?: string;
  steps: Step[];
};

const SECTIONS: Section[] = [
  {
    id: 'login',
    title: '၁။ CRM ဝင်ရောက်ခြင်း',
    icon: UserRound,
    intro: 'Staff / Admin အကောင့်ဖြင့် Sale CRM Dashboard သို့ ဝင်ပါ။',
    steps: [
      {
        title: 'Login စာမျက်နှာ ဖွင့်ပါ',
        body: 'Browser မှာ https://shop.29jewellery.com/crm သို့မဟုတ် /login သို့ သွားပါ။',
      },
      {
        title: 'အကောင့် ထည့်ပါ',
        body: 'Username နှင့် Password ရိုက်ပြီး User Agreement ကို သဘောတူပါ။ Default admin: admin / Password@123 (ထုတ်လုပ်ရေးမှာ စကားဝှက်ပြောင်းပါ)။',
      },
      {
        title: 'Dashboard သို့ ရောက်မည်',
        body: 'Login အောင်မြင်ရင် CRM History / Dashboard ဘက်သို့ ရောက်ပါမည်။ ဘယ်ဘက် menu မှ အခြားစာမျက်နှာများ သွားနိုင်သည်။',
      },
    ],
  },
  {
    id: 'products',
    title: '၂။ Products ထည့်သွင်း / စီမံခြင်း',
    icon: Package,
    intro: 'Shop မှာ ပေါ်မည့် လက်ဝတ်ရတနာများ ကို CRM ထဲကနေ ထည့်၊ ပြင်၊ ဖျက်နိုင်သည်။',
    steps: [
      {
        title: 'Shop → Products သို့ သွားပါ',
        body: 'ဘယ်ဘက် menu မှ Shop ကို ဖွင့်ပြီး Products ကို နှိပ်ပါ။',
      },
      {
        title: 'Category ပြင်ဆင်ပါ',
        body: 'Diamond / Gold / PT စသည့် category မရှိသေးရင် Categories → Add လုပ်ပါ။',
      },
      {
        title: 'New Product',
        body: 'Product Code, အမည်, Category, ဈေးနှုန်း (သို့မဟုတ် Price on inquiry), Featured / Special Offer၊ ပုံ ၄ ခု (front/back/side/other) ထည့်ပြီး Save လုပ်ပါ။',
      },
      {
        title: 'Filter ဖြင့် ရှာပါ',
        body: 'Special Offer, Featured, Active/Inactive, On inquiry, On discount စသည့် filter များဖြင့် စာရင်းကို စစ်နိုင်သည်။',
      },
      {
        title: 'QR Code',
        body: 'ထုတ်ကုန် card ပေါ်ရှိ QR ခလုတ်ဖြင့် public စာမျက်နှာ (/p/…) အတွက် QR ထုတ်ယူနိုင်သည်။',
      },
    ],
  },
  {
    id: 'shop-settings',
    title: '၃။ Shop Settings ပြင်ဆင်ခြင်း',
    icon: Settings,
    intro: 'ဆိုင်အမည်၊ WhatsApp / Viber၊ Invitation popup၊ Checkout / MMQR စသည်ကို General Settings မှ ပြင်ပါ။',
    steps: [
      {
        title: 'Settings → General',
        body: 'ညာဘက်အပေါ် Settings သို့မဟုတ် gear icon → General သို့ သွားပါ။',
      },
      {
        title: 'ဆက်သွယ်ရန် နံပါတ်များ',
        body: 'Shop WhatsApp နှင့် Shop Viber ကို ထည့်ပါ။ Shop စာမျက်နှာတွင် chat ခလုတ်များ ပေါ်မည်။',
      },
      {
        title: 'Invitation Popup',
        body: 'Grand Opening ပုံ / ခေါင်းစဉ် / ရက်စွဲ ကို ဖွင့်ပြီး Invite image upload လုပ်နိုင်သည်။',
      },
      {
        title: 'Checkout & MMQR',
        body: 'Checkout / Orders / Favourites ဖွင့်-ပိတ် နှင့် MMQR ငွေပေးချေမှု ပုံ / ဘဏ်အချက်အလက်များ သတ်မှတ်ပါ။',
      },
    ],
  },
  {
    id: 'orders-inquiries',
    title: '၄။ Orders နှင့် Inquiries',
    icon: ShoppingBag,
    intro: 'ဖောက်သည်များက Shop ကနေ မှာယူ / မေးမြန်းသည်များကို CRM မှ စီမံပါ။',
    steps: [
      {
        title: 'Shop → Orders',
        body: 'Online အော်ဒါစာရင်း။ Status ပြောင်းခြင်း (New → Confirmed → …) လုပ်နိုင်သည်။',
      },
      {
        title: 'Shop → Inquiries',
        body: 'WhatsApp / form မေးမြန်းမှုများ။ Status update လုပ်ပြီး follow-up လုပ်ပါ။',
      },
      {
        title: 'Shop Dashboard',
        body: 'အော်ဒါ / inquiry အရေအတွက် စုစုပေါင်းကို အကျဉ်းချုပ်ကြည့်နိုင်သည်။',
      },
    ],
  },
  {
    id: 'public-shop',
    title: '၅။ Public Shop (ဖောက်သည်ဘက်)',
    icon: Store,
    intro: 'ဖောက်သည်များ သုံးမည့် စာမျက်နှာ။',
    steps: [
      {
        title: 'Shop ဖွင့်ပါ',
        body: 'https://shop.29jewellery.com သို့မဟုတ် /shop — Collection, Special Offer, Featured ကို မြင်ရမည်။',
      },
      {
        title: 'Account / Guest',
        body: 'Account tab မှ Google Sign-In သို့မဟုတ် Guest ဖြင့် အချက်အလက် (အမည်၊ ဖုန်း၊ မွေးနေ့၊ လိပ်စာ၊ ဓာတ်ပုံ) ဖြည့်နိုင်သည်။',
      },
      {
        title: 'Cart & Checkout',
        body: 'ကုန်ပစ္စည်း Add to cart → Cart → Checkout → MMQR ငွေပေးချေမှု လမ်းညွှန်အတိုင်း မှာယူနိုင်သည်။',
      },
      {
        title: 'Order tracking',
        body: 'Orders tab မှ မှာယူထားသော အော်ဒါအခြေအနေ ကြည့်နိုင်သည် (Orders feature ဖွင့်ထားမှ)။',
      },
    ],
  },
  {
    id: 'google',
    title: '၆။ Google Login (Shop)',
    icon: QrCode,
    intro: 'ဖောက်သည် Google အကောင့်ဖြင့် ဝင်ရန် Client ID လိုအပ်သည်။',
    steps: [
      {
        title: 'Google Cloud Console',
        body: 'OAuth Web Client ID ဖန်တီးပြီး Authorized JavaScript origins တွင် https://shop.29jewellery.com ထည့်ပါ။',
      },
      {
        title: 'Server env',
        body: 'Frontend NEXT_PUBLIC_GOOGLE_CLIENT_ID နှင့် Backend SHOP_GOOGLE_CLIENT_ID တူညီစွာ ထည့်ပါ။',
      },
      {
        title: 'စမ်းသပ်ပါ',
        body: '/shop/account မှ Continue with Google နှိပ်ပြီး profile ဖြည့်ပါ။',
      },
    ],
  },
  {
    id: 'shortcut',
    title: '၇။ Phone Shortcut (Install App)',
    icon: Download,
    intro: 'Home screen မှာ app ပုံစံ shortcut ထည့်နိုင်သည်။',
    steps: [
      {
        title: 'Android / Chrome',
        body: 'Shop စာမျက်နှာဖွင့်ပြီး အောက်က Install shortcut banner မှ Install နှိပ်ပါ။ သို့မဟုတ် browser menu → Install app / Add to Home screen။',
      },
      {
        title: 'iPhone (Safari)',
        body: 'Share ခလုတ် → Add to Home Screen → Add။ Home screen မှာ 29 Shop icon ပေါ်မည်။',
      },
      {
        title: 'ဖွင့်သုံးခြင်း',
        body: 'Shortcut နှိပ်ရင် browser chrome မပါဘဲ app ပုံစံဖြင့် /shop သို့ တိုက်ရိုက် ရောက်မည်။',
      },
    ],
  },
];

function SectionCard({ section }: { section: Section }) {
  const [open, setOpen] = useState(true);
  const Icon = section.icon;

  return (
    <section
      id={section.id}
      className="overflow-hidden rounded-xl border border-[#e8e8e8] bg-white dark:border-neutral-800 dark:bg-neutral-900"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-[#fafafa] dark:hover:bg-neutral-800/60"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-[#262626] dark:text-neutral-100">
            {section.title}
          </h2>
          {section.intro ? (
            <p className="mt-0.5 text-xs leading-relaxed text-[#8c8c8c]">{section.intro}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-[#8c8c8c] transition', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <ol className="space-y-0 border-t border-[#f0f0f0] px-4 py-3 dark:border-neutral-800">
          {section.steps.map((step, i) => (
            <li key={step.title} className="flex gap-3 py-2.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5] text-[11px] font-semibold text-[#595959] dark:bg-neutral-800 dark:text-neutral-300">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#262626] dark:text-neutral-100">
                  {step.title}
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-[#595959] dark:text-neutral-400">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 p-3 pb-10 sm:p-6">
      <div className="rounded-xl border border-[#e8e8e8] bg-white px-4 py-4 sm:px-5 sm:py-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
            <BookOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="hidden text-lg font-semibold text-[#262626] md:block dark:text-neutral-100">
              How to use
            </h1>
            <p className="text-sm leading-relaxed text-[#8c8c8c] md:mt-1">
              Sale CRM နှင့် Online Shop ကို အဆင့်လိုက် အသုံးပြုနည်း (မြန်မာ)။ အောက်က အပိုင်းများကို
              နှိပ်၍ ဖတ်နိုင်ပါသည်။
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/shop"
                target="_blank"
                className="inline-flex items-center gap-1 rounded-lg border border-[#e8e8e8] px-2.5 py-1.5 text-xs font-medium text-[#595959] hover:border-primary hover:text-primary dark:border-neutral-700"
              >
                <Store className="h-3.5 w-3.5" />
                Open Shop
                <ExternalLink className="h-3 w-3" />
              </Link>
              <Link
                href="/api-docs"
                className="inline-flex items-center gap-1 rounded-lg border border-[#e8e8e8] px-2.5 py-1.5 text-xs font-medium text-[#595959] hover:border-primary hover:text-primary dark:border-neutral-700"
              >
                API Documentation
              </Link>
            </div>
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap gap-1.5 border-t border-[#f0f0f0] pt-3 dark:border-neutral-800">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full bg-[#f5f5f5] px-2.5 py-1 text-[11px] font-medium text-[#595959] hover:bg-primary/10 hover:text-primary dark:bg-neutral-800 dark:text-neutral-300"
            >
              {s.title.replace(/^\d+။\s*/, '')}
            </a>
          ))}
        </nav>
      </div>

      <div className="space-y-3">
        {SECTIONS.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
