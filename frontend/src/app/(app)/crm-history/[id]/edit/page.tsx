'use client';

import { useParams } from 'next/navigation';
import { CrmHistoryForm } from '@/components/crm-history-form';

export default function EditCrmHistoryPage() {
  const params = useParams<{ id: string }>();
  return <CrmHistoryForm recordId={params?.id} />;
}
