'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { JewelleryKind } from '@/lib/jewellery-specs';
import {
  caratFromMg,
  caratFromPoints,
  diamondPartsFromCarat,
  gramFromMyanmarParts,
  myanmarPartsFromGram,
  parseNum,
  strOrEmpty,
} from '@/lib/jewellery-weight';

type Props = {
  kind: JewelleryKind;
  weightGram: string;
  stoneCarat: string;
  onWeightGram: (v: string) => void;
  onStoneCarat: (v: string) => void;
};

export function JewelleryWeightFields({
  kind,
  weightGram,
  stoneCarat,
  onWeightGram,
  onStoneCarat,
}: Props) {
  const gram = parseNum(weightGram) ?? 0;
  const mm = myanmarPartsFromGram(gram);
  const carat = parseNum(stoneCarat) ?? 0;
  const dia = diamondPartsFromCarat(carat);

  function setGoldFromParts(next: { kyat?: number; pae?: number; yway?: number; gram?: number }) {
    if (next.gram != null) {
      onWeightGram(next.gram > 0 ? strOrEmpty(next.gram, 6) : '');
      return;
    }
    const k = next.kyat ?? mm.kyat;
    const p = next.pae ?? mm.pae;
    const y = next.yway ?? mm.yway;
    const g = gramFromMyanmarParts(k, p, y);
    onWeightGram(g > 0 ? strOrEmpty(g, 6) : '');
  }

  function setDiamondFromCarat(c: number) {
    onStoneCarat(c > 0 ? strOrEmpty(c, 6) : '');
  }

  if (kind === 'gold') {
    return (
      <div className="space-y-2 rounded border border-[#f0f0f0] bg-[#fafafa] p-3 dark:border-neutral-800 dark:bg-neutral-950">
        <div>
          <p className="text-xs font-medium text-[#262626] dark:text-neutral-200">
            ရွှေ အလေးချိန် · Gold weight
          </p>
          <p className="mt-0.5 text-[11px] text-[#8c8c8c]">
            ၁ ကျပ် = ၁၆ ပဲ = ၁၂၈ ရွေး ≈ ၁၆.၆၇ g — တစ်ခုပြင်ရင် အားလုံး sync ဖြစ်မယ်
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <UnitField
            id="kyat"
            label="ကျပ် (Kyat)"
            value={strOrEmpty(mm.kyat, 4)}
            onChange={(v) => setGoldFromParts({ kyat: parseNum(v) ?? 0 })}
          />
          <UnitField
            id="pae"
            label="ပဲ (Pae)"
            value={strOrEmpty(mm.pae, 4)}
            onChange={(v) => setGoldFromParts({ pae: parseNum(v) ?? 0 })}
          />
          <UnitField
            id="yway"
            label="ရွေး (Yway)"
            value={strOrEmpty(mm.yway, 4)}
            onChange={(v) => setGoldFromParts({ yway: parseNum(v) ?? 0 })}
          />
          <UnitField
            id="gram"
            label="ဂရမ် (g)"
            value={weightGram}
            step="0.001"
            onChange={(v) => setGoldFromParts({ gram: parseNum(v) ?? 0 })}
          />
        </div>
      </div>
    );
  }

  if (kind === 'diamond') {
    return (
      <div className="space-y-2 rounded border border-[#f0f0f0] bg-[#fafafa] p-3 dark:border-neutral-800 dark:bg-neutral-950">
        <div>
          <p className="text-xs font-medium text-[#262626] dark:text-neutral-200">
            စိန် အလေးချိန် · Diamond
          </p>
          <p className="mt-0.5 text-[11px] text-[#8c8c8c]">
            ၁ ct = ၁၀၀ pt = ၂၀၀ mg = ၀.၂ g
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <UnitField
            id="carat"
            label="Carat (ct)"
            value={stoneCarat}
            step="0.001"
            onChange={(v) => setDiamondFromCarat(parseNum(v) ?? 0)}
          />
          <UnitField
            id="points"
            label="Point (pt)"
            value={strOrEmpty(dia.points, 2)}
            step="0.01"
            onChange={(v) => setDiamondFromCarat(caratFromPoints(parseNum(v) ?? 0))}
          />
          <UnitField
            id="mg"
            label="Milligram (mg)"
            value={strOrEmpty(dia.mg, 2)}
            step="0.01"
            onChange={(v) => setDiamondFromCarat(caratFromMg(parseNum(v) ?? 0))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settingWeight">Setting / total metal weight (g) — optional</Label>
          <Input
            id="settingWeight"
            type="number"
            min={0}
            step="0.001"
            value={weightGram}
            onChange={(e) => onWeightGram(e.target.value)}
            placeholder="Metal setting weight in grams"
          />
        </div>
      </div>
    );
  }

  // platinum / other — gram (+ optional stone carat)
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="weight">{kind === 'platinum' ? 'Weight (g)' : 'Weight (g)'}</Label>
        <Input
          id="weight"
          type="number"
          min={0}
          step="0.001"
          value={weightGram}
          onChange={(e) => onWeightGram(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="carat">
          {kind === 'platinum' ? 'Diamond / Stone (ct)' : 'Stone (ct)'}
        </Label>
        <Input
          id="carat"
          type="number"
          min={0}
          step="0.001"
          value={stoneCarat}
          onChange={(e) => onStoneCarat(e.target.value)}
        />
      </div>
    </div>
  );
}

function UnitField({
  id,
  label,
  value,
  onChange,
  step = '0.001',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[11px]">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
