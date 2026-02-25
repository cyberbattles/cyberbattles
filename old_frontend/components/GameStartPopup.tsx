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
      <div
        className="relative mx-4 w-full max-w-2xl overflow-hidden rounded-2xl
          bg-[#2E2D2D] shadow-2xl"
      >
        {/* Header with celebration effect */}
        <div className="relative bg-[#1e1e1e] p-6 text-center">
          <div className="relative">
            <h1 className="mb-2 text-3xl font-bold text-white">
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
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-b-xl bg-green-600 px-4 py-3
              font-semibold text-white transition hover:bg-green-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameStartPopup;
