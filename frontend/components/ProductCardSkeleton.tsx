import React from 'react';

const ProductCardSkeleton: React.FC = () => (
  <div className="flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-slate-100 bg-white shadow-sm animate-pulse">
    <div className="aspect-square bg-slate-100 sm:h-64 sm:aspect-auto" />
    <div className="flex flex-1 flex-col p-4 sm:p-5">
      <div className="mb-2 space-y-2">
        <div className="h-4 bg-slate-100 rounded-full w-4/5" />
        <div className="h-4 bg-slate-100 rounded-full w-2/3" />
      </div>
      <div className="mb-3 flex gap-1.5">
        <div className="h-5 bg-slate-100 rounded-md w-16" />
        <div className="h-5 bg-slate-100 rounded-md w-20" />
      </div>
      <div className="mt-auto space-y-3 border-t border-slate-100 pt-3">
        <div className="h-5 bg-slate-100 rounded-full w-1/3" />
        <div className="grid grid-cols-2 gap-1.5">
          <div className="h-9 bg-slate-100 rounded-lg" />
          <div className="h-9 bg-slate-100 rounded-lg" />
        </div>
      </div>
    </div>
  </div>
);

export default ProductCardSkeleton;
