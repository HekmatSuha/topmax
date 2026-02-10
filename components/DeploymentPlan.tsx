
import React from 'react';
import { DEPLOYMENT_PLAN } from '../constants';
import { Language } from '../types';
import { translations } from '../translations';

interface DeploymentPlanProps {
  language: Language;
}

const DeploymentPlan: React.FC<DeploymentPlanProps> = ({ language }) => {
  const t = translations;
  return (
    <div className="max-w-4xl mx-auto my-16 px-4">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-serif font-bold text-slate-900 mb-4">{t.technicalRoadmap[language]}</h2>
        <p className="text-gray-500 text-lg">{t.roadmapSubtitle[language]}</p>
      </div>
      <div className="space-y-8">
        {DEPLOYMENT_PLAN.map((step, idx) => (
          <div key={idx} className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
            <h3 className="text-2xl font-bold mb-2">{step.title[language]}</h3>
            <p className="text-gray-600 mb-6">{step.description[language]}</p>
            <div className="bg-slate-900 rounded-xl p-6 font-mono text-sm text-green-400">
               {step.commands.map((cmd, i) => <div key={i}>$ {cmd}</div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeploymentPlan;
