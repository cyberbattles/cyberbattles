'use client';
import React, {useEffect, useState} from 'react';
import {auth, db} from '@/lib/firebase';
import {doc, getDoc} from 'firebase/firestore';
import {useRouter} from 'next/navigation';

interface GameStartPopupProps {
  teamName: string;
  isVisible: boolean;
  onClose: () => void;
}

const GameStartPopup: React.FC<GameStartPopupProps> = ({
  teamName,
  isVisible,
  onClose,
}) => {
  const router = useRouter();
  if (!isVisible) return null;

  const handleBackToDashboard = () => {
    router.push('/dashboard');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-51 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Popup Content */}
      <div className="relative bg-[#2E2D2D] rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
        {/* Header with celebration effect */}
        <div className="relative bg-[#1e1e1e] p-6 text-center">
          <div className="relative">
            <h1 className="text-3xl font-bold text-white mb-2">
              {teamName}, your game has started!
            </h1>
          </div>
          <div className="italic">
            Jump into your CyberBattles game by visiting the shell or monitoring
            network traffic. <br />
            You can use your own terminal by following the VPN setup guide.
          </div>
        </div>
        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="cursor-pointer flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-b-xl transition font-semibold text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameStartPopup;
