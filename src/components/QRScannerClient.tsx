'use client';

import React, { useState, useEffect, useRef } from 'react';
import { scanTicketAction } from '@/app/actions/eventActions';
import { useApp } from './AppContext';
import { QrCode, ShieldAlert, CheckCircle2, XCircle, AlertCircle, Camera, RefreshCw } from 'lucide-react';

export const QRScannerClient: React.FC = () => {
  const { currentUser } = useApp();
  const [tokenInput, setTokenInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);

  const handleProcessScan = async (token: string) => {
    if (!token || token.trim().length === 0) return;
    setScanning(true);
    setScanResult(null);

    try {
      const result = await scanTicketAction(token.trim(), currentUser.id);
      setScanResult(result);
    } catch (err: any) {
      setScanResult({
        status: 'ERROR',
        message: 'Scan processing error: ' + (err.message || 'Unknown error'),
      });
    } finally {
      setScanning(false);
    }
  };

  const startWebCamScanner = async () => {
    setCameraError(null);
    try {
      const { Html5QrcodeScanner } = await import('html5-qrcode');
      const html5QrcodeScanner = new Html5QrcodeScanner(
        'reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scannerRef.current = html5QrcodeScanner;

      html5QrcodeScanner.render(
        (decodedText: string) => {
          html5QrcodeScanner.clear();
          handleProcessScan(decodedText);
        },
        (errorMessage: string) => {
          // ignore scan frame errors
        }
      );
    } catch (err: any) {
      setCameraError('Camera access not supported or denied in browser context. Use token string scanner below.');
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) {}
      }
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Scanner Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-teal-400 text-xs font-bold uppercase tracking-wider">
            <QrCode className="w-4 h-4" />
            <span>Mobile Gate Scanner & Anti-Counterfeit Guard</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">Door Entry Validator</h1>
          <p className="text-slate-400 text-xs mt-1">
            Zero-install browser QR check-in powered by HMAC-SHA256 signature verification & duplicate scan locking.
          </p>
        </div>

        <div className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300 flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Staff ID: <strong className="text-white">{currentUser.name.split(' ')[0]}</strong> ({currentUser.role})</span>
        </div>
      </div>

      {/* Camera Stream Viewport Container */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2 text-sm font-bold text-white">
            <Camera className="w-4 h-4 text-teal-400" />
            <span>Camera Stream Scanner</span>
          </div>
          <button
            onClick={startWebCamScanner}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-lg flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Activate Camera Stream</span>
          </button>
        </div>

        <div id="reader" className="w-full min-h-[200px] flex items-center justify-center rounded-xl overflow-hidden bg-slate-900 text-slate-400 text-xs text-center border border-slate-800">
          <div className="p-6">
            <QrCode className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p>Click "Activate Camera Stream" to launch camera or enter Base64URL QR Token payload below.</p>
          </div>
        </div>

        {cameraError && (
          <div className="p-3 bg-amber-950/40 border border-amber-800 rounded-xl text-amber-300 text-xs">
            {cameraError}
          </div>
        )}

        {/* Manual Token Scan Fallback Form */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Manual / Simulated Base64URL QR Token Input
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste base64url signed QR secret payload token..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
            />
            <button
              onClick={() => handleProcessScan(tokenInput)}
              disabled={scanning}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50"
            >
              {scanning ? 'Verifying...' : 'Validate Entry'}
            </button>
          </div>
        </div>
      </div>

      {/* Gate Entry Validation Result Display */}
      {scanResult && (
        <div
          className={`p-6 rounded-2xl border shadow-2xl transition-all space-y-3 ${
            scanResult.status === 'VALID'
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
              : scanResult.status === 'ALREADY_CHECKED_IN'
              ? 'bg-amber-950/60 border-amber-500/50 text-amber-200'
              : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-3">
            {scanResult.status === 'VALID' && <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />}
            {scanResult.status === 'ALREADY_CHECKED_IN' && <AlertCircle className="w-8 h-8 text-amber-400 flex-shrink-0" />}
            {scanResult.status === 'FRAUD_ALERT' && <ShieldAlert className="w-8 h-8 text-rose-400 flex-shrink-0" />}
            {scanResult.status === 'CANCELLED' && <XCircle className="w-8 h-8 text-rose-400 flex-shrink-0" />}

            <div>
              <h3 className="text-xl font-extrabold tracking-tight">{scanResult.message}</h3>
              {scanResult.attendeeName && (
                <p className="text-xs font-semibold mt-0.5 opacity-90">
                  Attendee: {scanResult.attendeeName} • {scanResult.seatInfo}
                </p>
              )}
            </div>
          </div>

          {scanResult.status === 'ALREADY_CHECKED_IN' && (
            <div className="bg-amber-900/40 p-3 rounded-xl border border-amber-500/30 text-xs font-mono space-y-1">
              <div>Duplicate Scan Alert (FR-6.3)</div>
              <div>Initial Check-in Time: {scanResult.checkedInAt ? new Date(scanResult.checkedInAt).toLocaleString() : 'Earlier'}</div>
              <div>Authorized Staff ID: {scanResult.staffId || 'STAFF_01'}</div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
