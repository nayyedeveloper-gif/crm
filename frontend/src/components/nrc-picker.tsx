'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type { ApiResponse, NrcResponse } from '@/types';
import { NRC_STATE_CODES, NRC_TYPES, NRC_TYPE_EN_TO_MM, toMyanmarNumber, fromMyanmarNumber } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface NrcPickerProps {
  value: string | null;
  onChange: (nrc: string | null) => void;
}

export function NrcPicker({ value, onChange }: NrcPickerProps) {
  const [nrcs, setNrcs] = useState<NrcResponse[]>([]);
  const [stateCode, setStateCode] = useState<string>('');
  const [townshipCode, setTownshipCode] = useState<string>('');
  const [nrcType, setNrcType] = useState<string>('N');
  const [serialNumber, setSerialNumber] = useState<string>('');

  useEffect(() => {
    api
      .get<ApiResponse<NrcResponse[]>>('/nrcs')
      .then(({ data }) => setNrcs(data.data ?? []))
      .catch(() => setNrcs([]));
  }, []);

  useEffect(() => {
    if (value) {
      // Try Myanmar format first: ၇/ရတရ(နိုင်)၁၃၃၉၇၈
      const mmMatch = value.match(/^([၀-၉]+)\/([^()]+)\(([^()]+)\)([၀-၉]+)$/);
      if (mmMatch) {
        const [, sc, tc, typeMm, numMm] = mmMatch;
        const enSc = fromMyanmarNumber(sc);
        const enNum = fromMyanmarNumber(numMm);
        // Find the NRC entry matching this township abbreviation
        const entry = nrcs.find((n) => {
          const abbr = n.nameMm.match(/^\((.+)\)/);
          return abbr && abbr[1] === tc;
        });
        setStateCode(enSc);
        setTownshipCode(entry ? entry.nameEn : tc);
        // Convert Myanmar type back to English
        const typeEn = Object.entries(NRC_TYPE_EN_TO_MM).find(([, v]) => v === typeMm)?.[0] || 'N';
        setNrcType(typeEn);
        setSerialNumber(enNum);
        return;
      }
      // Try English format: 7/YaTaYa(N)133978
      const enMatch = value.match(/^(\d+)\/([^(]+)\(([A-Z])\)(\d+)$/);
      if (enMatch) {
        const [, sc, tc, type, num] = enMatch;
        setStateCode(sc);
        setTownshipCode(tc);
        setNrcType(type);
        setSerialNumber(num);
      }
    }
  }, [value, nrcs]);

  const getTownshipAbbrMm = (townshipEn: string): string => {
    const entry = nrcs.find((n) => n.nameEn === townshipEn);
    if (entry) {
      const abbr = entry.nameMm.match(/^\((.+)\)/);
      if (abbr) return abbr[1];
    }
    return townshipEn;
  };

  const buildNrc = (
    sc: string,
    tc: string,
    type: string,
    num: string
  ): string | null => {
    if (sc && tc && type && num) {
      const scMm = toMyanmarNumber(sc);
      const tcMm = getTownshipAbbrMm(tc);
      const typeMm = NRC_TYPE_EN_TO_MM[type] || type;
      const numMm = toMyanmarNumber(num);
      return `${scMm}/${tcMm}(${typeMm})${numMm}`;
    }
    return null;
  };

  const handleStateChange = (sc: string) => {
    if (sc === 'none') {
      setStateCode('');
      setTownshipCode('');
      onChange(null);
      return;
    }
    setStateCode(sc);
    setTownshipCode('');
    onChange(buildNrc(sc, '', nrcType, serialNumber));
  };

  const handleTownshipChange = (tc: string) => {
    if (tc === 'none') {
      setTownshipCode('');
      onChange(buildNrc(stateCode, '', nrcType, serialNumber));
      return;
    }
    setTownshipCode(tc);
    onChange(buildNrc(stateCode, tc, nrcType, serialNumber));
  };

  const handleTypeChange = (type: string) => {
    setNrcType(type);
    onChange(buildNrc(stateCode, townshipCode, type, serialNumber));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Accept both English and Myanmar digits, convert to English for storage
    const raw = e.target.value;
    const enNum = fromMyanmarNumber(raw).replace(/\D/g, '').slice(0, 6);
    setSerialNumber(enNum);
    onChange(buildNrc(stateCode, townshipCode, nrcType, enNum));
  };

  const filteredNrcs = stateCode
    ? nrcs.filter((n) => n.nrcCode === parseInt(stateCode))
    : [];

  return (
    <div className="flex items-center gap-2">
      <Select value={stateCode || 'none'} onValueChange={handleStateChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="ပြည်နယ်/တိုင်း" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">-- မရွေး --</SelectItem>
          {NRC_STATE_CODES.map((s) => (
            <SelectItem key={s.code} value={s.code.toString()}>
              {toMyanmarNumber(s.code.toString())}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-muted-foreground">/</span>

      <Select
        value={townshipCode || 'none'}
        onValueChange={handleTownshipChange}
        disabled={!stateCode}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="မြို့နယ်ကုဒ်" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">-- မရွေး --</SelectItem>
          {filteredNrcs.map((n) => {
            const abbr = n.nameMm.match(/^\((.+)\)/);
            const abbrText = abbr ? abbr[1] : n.nameMm;
            return (
              <SelectItem key={n.id} value={n.nameEn}>
                {abbrText}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <Select value={nrcType} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {NRC_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label.replace(/[()]/g, '')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="text"
        inputMode="numeric"
        placeholder="၀၀၀၀၀၀"
        value={toMyanmarNumber(serialNumber)}
        onChange={handleNumberChange}
        maxLength={6}
        className="w-[120px]"
      />
    </div>
  );
}
