import React from 'react';
import { ResourceBuilding } from './ResourceBuilding';
import '../styles/fortress-district.css';

interface ResourceData {
  type: 'mana' | 'gold' | 'diamond' | 'ore';
  symbol: string;
  yieldRate: number;
  color: string;
}

const resources: ResourceData[] = [
  { type: 'mana',    symbol: 'HBAR', yieldRate: 5,  color: '#3b82f6' },
  { type: 'gold',    symbol: 'SOL',  yieldRate: 8,  color: '#fbbf24' },
  { type: 'diamond', symbol: 'ETH',  yieldRate: 12, color: '#60a5fa' },
  { type: 'ore',     symbol: 'USDC', yieldRate: 6,  color: '#a78bfa' },
];

export const FortressResourceDistrict: React.FC = () => {
  return (
    <div className="fortress-courtyard">
      <div className="building-slot top-left">
        <ResourceBuilding {...resources[0]} />
      </div>
      <div className="building-slot top-right">
        <ResourceBuilding {...resources[1]} />
      </div>
      <div className="building-slot bottom-left">
        <ResourceBuilding {...resources[2]} />
      </div>
      <div className="building-slot bottom-right">
        <ResourceBuilding {...resources[3]} />
      </div>
    </div>
  );
};

export default FortressResourceDistrict;
