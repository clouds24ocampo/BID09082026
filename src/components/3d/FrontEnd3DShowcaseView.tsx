import React, { useState } from 'react';
import { ThreeCanvasContainer, SceneMode } from './ThreeCanvasContainer';
import { soundEngine } from './SoundEngine';
import {
  Box,
  Radio,
  Layers,
  Volume2,
  VolumeX,
  Sparkles,
  ShieldCheck,
  FileText,
  Building2,
  ExternalLink,
  ChevronRight,
  Info,
  Maximize2,
  Minimize2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface FrontEnd3DShowcaseViewProps {
  onNavigateTab?: (tab: string) => void;
  isStandalone?: boolean;
}

export const FrontEnd3DShowcaseView: React.FC<FrontEnd3DShowcaseViewProps> = ({
  onNavigateTab,
  isStandalone = false
}) => {
  const [sceneMode, setSceneMode] = useState<SceneMode>('ENVELOPE');
  const [unboxed, setUnboxed] = useState(false);
  const [regime, setRegime] = useState<'RA_12009' | 'RA_9184'>('RA_12009');
  const [isAudioMuted, setIsAudioMuted] = useState(soundEngine.getMuted());
  const [selectedObject, setSelectedObject] = useState<any | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleSound = () => {
    const unmuted = soundEngine.toggleMute();
    setIsAudioMuted(!unmuted);
  };

  const handleToggleUnbox = () => {
    soundEngine.playUnbox();
    setUnboxed((prev) => !prev);
  };

  const handleSelectMode = (mode: SceneMode) => {
    soundEngine.playClick(580);
    setSceneMode(mode);
    setSelectedObject(null);
  };

  const handleToggleRegime = (target: 'RA_12009' | 'RA_9184') => {
    soundEngine.playRegimeShift();
    setRegime(target);
  };

  return (
    <div className={`relative w-full bg-[#030712] text-slate-100 flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 h-screen' : 'h-215 rounded-2xl border border-white/10 shadow-2xl overflow-hidden'}`}>
      {/* 1. TOP CONTROL HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 md:p-6 flex flex-wrap items-center justify-between gap-4 bg-linear-to-b from-[#030712]/95 via-[#030712]/75 to-transparent backdrop-blur-sm pointer-events-none">
        {/* Left: Branding & Status */}
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-cyan-500/20 to-violet-600/20 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.25)]">
            <Box className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm md:text-base tracking-wide text-white">BiDOCS 3D CORE</span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                WEBGL 60FPS
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Quantum Cloud Corporation • Philippine Gov Procurement (RA 12009 / RA 9184)
            </p>
          </div>
        </div>

        {/* Center: Mode Selectors */}
        <div className="pointer-events-auto flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/10 backdrop-blur-md shadow-lg">
          <button
            onClick={() => handleSelectMode('ENVELOPE')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              sceneMode === 'ENVELOPE'
                ? 'bg-linear-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_12px_rgba(0,240,255,0.35)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Bid Envelopes (3D Unbox)</span>
          </button>

          <button
            onClick={() => handleSelectMode('RADAR')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              sceneMode === 'RADAR'
                ? 'bg-linear-to-r from-emerald-500 to-teal-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>PhilGEPS Regional Radar</span>
          </button>

          <button
            onClick={() => handleSelectMode('REGIME')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              sceneMode === 'REGIME'
                ? 'bg-linear-to-r from-amber-500 to-violet-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Statutory Prism (RA 12009)</span>
          </button>
        </div>

        {/* Right: Sound & Fullscreen Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={toggleSound}
            title={isAudioMuted ? 'Enable Quantum Sound Effects' : 'Mute Sound'}
            className={`p-2 rounded-lg border transition-all ${
              !isAudioMuted
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                : 'bg-slate-900/80 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            {!isAudioMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg bg-slate-900/80 text-slate-400 border border-white/10 hover:text-white transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. MAIN 3D VIEWPORT */}
      <div className="relative flex-1 w-full h-full">
        <ThreeCanvasContainer
          mode={sceneMode}
          unboxed={unboxed}
          regime={regime}
          onSelectObject={(obj) => setSelectedObject(obj)}
          className="w-full h-full"
        />

        {/* Floating Instructions Overlay */}
        <div className="absolute bottom-6 left-6 z-20 pointer-events-none hidden sm:flex items-center gap-3 bg-slate-900/70 border border-white/10 px-3.5 py-2 rounded-xl backdrop-blur-md text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Click & Drag to rotate in 3D • Scroll to zoom • Click any element for legal telemetry</span>
        </div>

        {/* Mode Specific Bottom Actions */}
        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-3">
          {sceneMode === 'ENVELOPE' && (
            <button
              onClick={handleToggleUnbox}
              className={`px-4 py-2.5 rounded-xl font-semibold text-xs tracking-wide shadow-lg border transition-all flex items-center gap-2 ${
                unboxed
                  ? 'bg-linear-to-r from-amber-500 to-orange-600 border-amber-400/40 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'bg-linear-to-r from-cyan-500 to-blue-600 border-cyan-400/40 text-white shadow-[0_0_15px_rgba(0,240,255,0.3)]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{unboxed ? 'SEAL MOTHER ENVELOPE' : '3D UNBOX & EXPLODE COVERS'}</span>
            </button>
          )}

          {sceneMode === 'REGIME' && (
            <div className="flex items-center bg-slate-900/90 border border-white/15 p-1 rounded-xl shadow-xl backdrop-blur-md">
              <button
                onClick={() => handleToggleRegime('RA_12009')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  regime === 'RA_12009'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                RA 12009 (NGPA 2024/2025)
              </button>
              <button
                onClick={() => handleToggleRegime('RA_9184')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  regime === 'RA_9184'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                RA 9184 (2016 IRR)
              </button>
            </div>
          )}
        </div>

        {/* Interactive Telemetry Drawer (When Object is Clicked) */}
        {selectedObject && (
          <div className="absolute top-24 right-6 z-30 w-80 md:w-96 max-h-[70vh] overflow-y-auto bg-slate-950/90 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-start justify-between border-b border-white/10 pb-3 mb-3">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">
                  {selectedObject.type} TELEMETRY
                </span>
                <h3 className="font-bold text-base text-white mt-0.5">
                  {selectedObject.data.name || selectedObject.data.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedObject(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-white/5 border border-white/10"
              >
                ✕
              </button>
            </div>

            {/* Envelope Details */}
            {selectedObject.type === 'ENVELOPE' && (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 font-mono">Statutory Basis:</span>
                  <p className="text-cyan-300 font-mono font-medium">{selectedObject.data.statutoryReference}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-mono">Component Description:</span>
                  <p className="text-slate-300 mt-0.5 leading-relaxed">{selectedObject.data.description}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-mono">Mandatory Statutory Documents:</span>
                  <ul className="mt-1.5 space-y-1">
                    {selectedObject.data.mandatoryDocuments.map((doc: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-1.5 text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {onNavigateTab && (
                  <div className="pt-3 border-t border-white/10 flex gap-2">
                    <button
                      onClick={() => onNavigateTab('covers')}
                      className="flex-1 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 text-xs transition-all shadow-md"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Configure Covers</span>
                    </button>
                    <button
                      onClick={() => onNavigateTab('bids')}
                      className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium flex items-center justify-center gap-1.5 text-xs border border-white/15 transition-all"
                    >
                      <span>Package Builder</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Radar Hub Details */}
            {selectedObject.type === 'RADAR_HUB' && (
              <div className="space-y-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/20">
                  <div className="text-[10px] font-mono text-emerald-400">TOTAL APPROVED BUDGET (ABC)</div>
                  <div className="text-xl font-extrabold text-white mt-0.5">{selectedObject.data.totalAbc}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-mono">Region / Location:</span>
                  <p className="text-white font-medium">{selectedObject.data.region}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-mono">Procurement Category:</span>
                  <p className="text-cyan-300 font-medium">{selectedObject.data.category}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-mono">Lead Procuring Agency:</span>
                  <p className="text-slate-200">{selectedObject.data.leadAgency}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-mono">PhilGEPS Solicitation No:</span>
                  <p className="text-slate-200 font-mono">{selectedObject.data.solicitationNo}</p>
                </div>

                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('opportunities')}
                    className="w-full mt-2 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 text-xs transition-all shadow-md"
                  >
                    <span>View In Opportunity Finder</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Regime Facet Details */}
            {selectedObject.type === 'REGIME_FACET' && (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 font-mono">Governance Pillar:</span>
                  <p className="text-amber-400 font-bold text-sm">{selectedObject.data.pillar}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-mono">Statutory Basis:</span>
                  <p className="text-cyan-300 font-mono">{selectedObject.data.legalBasis}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-mono">Implementation Details:</span>
                  <p className="text-slate-300 mt-0.5 leading-relaxed">{selectedObject.data.description}</p>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>STATUS: {selectedObject.data.status}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. BOTTOM LIVE TELEMETRY BAR */}
      <div className="z-20 border-t border-white/10 bg-slate-950/90 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-6 text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>PLATFORM: ACTIVE (RA 12009 NGPA)</span>
          </div>
          <div className="hidden md:block">
            <span>PACKAGING: THREE-LAYER ENVELOPE STANDARD</span>
          </div>
          <div className="hidden lg:block text-cyan-400">
            <span>TENANT: QUANTUM CLOUD CORPORATION</span>
          </div>
        </div>

        {onNavigateTab && !isStandalone && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('dashboard')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => onNavigateTab('bids')}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all font-sans font-medium"
            >
              Launch Bidding Builder →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
