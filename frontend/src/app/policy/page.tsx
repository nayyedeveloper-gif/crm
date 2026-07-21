'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { ApiResponse, AppSettingsResponse } from '@/types';
import { LegalPage, LegalSection } from '@/components/legal-page';

function renderBody(text: string, appName: string) {
  const body = text.replaceAll('{appName}', appName).trim();
  if (!body) return null;
  const blocks = body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block, i) => {
    const lines = block.split('\n');
    const title = lines[0]?.trim() || `Section ${i + 1}`;
    const content = lines.slice(1).join('\n').trim();
    if (!content) {
      return (
        <p key={i} className="whitespace-pre-wrap text-sm leading-relaxed text-[#595959]">
          {title}
        </p>
      );
    }
    return (
      <LegalSection key={i} title={title}>
        <p className="whitespace-pre-wrap">{content}</p>
      </LegalSection>
    );
  });
}

export default function PrivacyPolicyPage() {
  const [appName, setAppName] = useState('Sale CRM');
  const [body, setBody] = useState<string | null>(null);
  const [updated, setUpdated] = useState('—');

  useEffect(() => {
    api
      .get<ApiResponse<AppSettingsResponse>>('/settings/general/public')
      .then(({ data }) => {
        const d = data.data;
        setAppName(d.appName || 'Sale CRM');
        setBody(d.privacyPolicy || null);
        setUpdated(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }));
      })
      .catch(() => undefined);
  }, []);

  return (
    <LegalPage appName={appName} title="Privacy Policy" updated={updated}>
      {body ? (
        renderBody(body, appName)
      ) : (
        <p className="text-sm text-[#8c8c8c]">Content is being prepared.</p>
      )}
    </LegalPage>
  );
}
