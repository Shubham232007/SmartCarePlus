import React from 'react';
import { Info } from 'lucide-react';

export const DisclaimerFooter: React.FC = () => {
  return (
    <footer className="mt-8 border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500 bg-slate-50/80 rounded-b-xl">
      <div className="flex items-center justify-center space-x-2 max-w-4xl mx-auto">
        <Info className="w-4 h-4 text-teal-600 shrink-0" />
        <p>
          <span className="font-semibold text-slate-700">Medical Disclaimer:</span> SmartCare+ is an assistive IoT monitoring prototype and does not replace professional medical diagnosis, clinical judgment, or immediate emergency service dispatch.
        </p>
      </div>
    </footer>
  );
};
