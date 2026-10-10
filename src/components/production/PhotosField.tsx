'use client';

import * as React from 'react';
import { useState } from 'react';
import { toast } from '@/components/ui';
import { Camera, Image as ImageIcon, Trash2, UploadCloud, Loader2 } from 'lucide-react';

async function photoData(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error('Chọn ảnh JPG, PNG hoặc WebP không quá 5 MB');
  }
  const url = URL.createObjectURL(file);
  try {
    const picture = new Image();
    await new Promise<void>((resolve, reject) => {
      picture.onload = () => resolve();
      picture.onerror = () => reject(new Error('Không đọc được ảnh'));
      picture.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(picture.width, picture.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(picture.width * scale));
    canvas.height = Math.max(1, Math.round(picture.height * scale));
    canvas.getContext('2d')!.drawImage(picture, 0, 0, canvas.width, canvas.height);
    const encoded = canvas.toDataURL('image/jpeg', 0.8);
    if (encoded.length > 1024 * 1024) throw new Error('Ảnh quá lớn; chọn ảnh nhỏ hơn');
    return encoded;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PhotosField({
  value,
  onChange,
  onBusyChange,
}: {
  value: string;
  onChange: (v: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const photos = value.split('\n').filter(Boolean);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-slate-500" />
          <span>Hình ảnh minh chứng công đoạn / QC ({photos.length}/20)</span>
        </label>
        {loading && (
          <span className="text-[11px] text-blue-600 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Đang nén & chuẩn bị ảnh…
          </span>
        )}
      </div>

      <div className="border border-dashed border-slate-300 rounded-lg p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
        <label className="flex flex-col items-center justify-center cursor-pointer gap-1 py-1">
          <UploadCloud className="w-6 h-6 text-slate-400" />
          <span className="text-xs font-medium text-slate-600">Bấm để tải ảnh lên từ máy hoặc kéo thả vào đây</span>
          <span className="text-[10px] text-slate-400">Hỗ trợ JPG, PNG, WebP (Tối đa 5MB/ảnh, tự động nén tối ưu)</span>
          <input
            aria-label="Ảnh công đoạn QC"
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={loading}
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = '';
              setLoading(true);
              onBusyChange?.(true);
              try {
                if (files.length + photos.length > 20) throw new Error('Tối đa 20 ảnh mỗi lần ghi');
                const urls = [...photos];
                for (const file of files) urls.push(await photoData(file));
                if (urls.join('').length > 3 * 1024 * 1024) {
                  throw new Error('Tổng ảnh vượt giới hạn; chia thành các lần ghi nhật ký');
                }
                onChange(urls.join('\n'));
              } catch (err: any) {
                toast.error(err.message);
              } finally {
                setLoading(false);
                onBusyChange?.(false);
              }
            }}
          />
        </label>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
          {photos.map((url, n) => (
            <div
              key={`${url.slice(0, 60)}-${n}`}
              className="group relative rounded-md overflow-hidden border border-slate-200 bg-slate-100 aspect-square shadow-sm"
            >
              <img
                src={url}
                alt={`Ảnh ${n + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <button
                type="button"
                aria-label={`Bỏ ảnh ${n + 1}`}
                className="absolute top-1 right-1 bg-black/60 hover:bg-rose-600 text-white p-1 rounded-full opacity-90 transition-opacity"
                onClick={() => onChange(photos.filter((_, i) => i !== n).join('\n'))}
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] px-1 rounded font-mono">
                #{n + 1}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
