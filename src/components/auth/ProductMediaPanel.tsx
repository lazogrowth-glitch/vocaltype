/* eslint-disable i18next/no-literal-string */
import { Globe2, Mic2, Settings2, Sparkles, Wand2 } from "lucide-react";
import type { AuthStepContent } from "./authOnboardingContent";

interface ProductMediaPanelProps {
  step: AuthStepContent;
}

const renderStepCard = (step: AuthStepContent) => {
  switch (step.id) {
    case "permissions":
      return (
        <div className="vt-media-card vt-media-card-permissions">
          <div className="vt-media-toolbar">
            <div className="vt-media-bullet" />
            <div className="vt-media-bullet" />
            <div className="vt-media-bullet" />
          </div>
          <div className="vt-media-stack">
            {[
              { icon: <Mic2 size={15} />, label: "Microphone", state: "Ready" },
              {
                icon: <Settings2 size={15} />,
                label: "Accessibility",
                state: "Enabled",
              },
              {
                icon: <Sparkles size={15} />,
                label: "Global shortcut",
                state: "Bound",
              },
            ].map((item) => (
              <div key={item.label} className="vt-permission-row">
                <div className="vt-permission-icon">{item.icon}</div>
                <div className="vt-permission-copy">
                  <div>{item.label}</div>
                  <span>{item.state}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case "set-up":
      return (
        <div className="vt-media-card vt-media-card-setup">
          <div className="vt-chip-cloud">
            <span>Windows</span>
            <span>ChatGPT</span>
            <span>Claude</span>
            <span>Gemini</span>
          </div>
          <div className="vt-setup-shell">
            <div className="vt-setup-head">Vocalype is ready</div>
            <div className="vt-setup-line" />
            <div className="vt-setup-grid">
              <div>Shortcut active</div>
              <div>Voice capture armed</div>
              <div>Paste injection synced</div>
              <div>Premium access checked</div>
            </div>
          </div>
        </div>
      );
    case "learn":
      return (
        <div className="vt-media-card vt-media-card-learn">
          <div className="vt-message-window">
            <div className="vt-message-header">
              <div className="vt-message-app">
                <Globe2 size={16} />
                <span>Workspace</span>
              </div>
              <span>Voice draft</span>
            </div>
            <div className="vt-message-body">
              <div className="vt-message-line vt-long" />
              <div className="vt-message-line vt-mid" />
              <div className="vt-message-line vt-short" />
            </div>
            <div className="vt-message-output">
              "Peux-tu envoyer la version finale au client avant 16h ?"
            </div>
          </div>
        </div>
      );
    case "personalize":
      return (
        <div className="vt-media-card vt-media-card-personalize">
          <div className="vt-chip-cloud">
            <span>French</span>
            <span>English</span>
            <span>Formal</span>
            <span>Fast edits</span>
          </div>
          <div className="vt-profile-shell">
            <div className="vt-profile-row">
              <span>Preferred language</span>
              <strong>French</strong>
            </div>
            <div className="vt-profile-row">
              <span>Output style</span>
              <strong>Clean</strong>
            </div>
            <div className="vt-profile-row">
              <span>Correction level</span>
              <strong>Balanced</strong>
            </div>
          </div>
        </div>
      );
    default:
      return (
        <div className="vt-media-card vt-media-card-signup">
          <div className="vt-chip-cloud">
            <span>ChatGPT</span>
            <span>Claude</span>
            <span>Gemini</span>
            <span>Windows</span>
          </div>
          <div className="vt-hero-shell">
            <div className="vt-hero-title">
              Write everywhere with your voice
            </div>
            <div className="vt-hero-note">
              Fast capture. Clean output. Premium dictation.
            </div>
            <div className="vt-transcript-card">
              <Wand2 size={18} />
              <span>
                "Rappelle-moi de livrer la maquette finale demain matin."
              </span>
            </div>
          </div>
        </div>
      );
  }
};

export const ProductMediaPanel = ({ step }: ProductMediaPanelProps) => {
  return (
    <section
      style={{
        minHeight: 0,
        position: "relative",
        overflow: "hidden",
        borderRadius: 34,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "radial-gradient(circle at top right, rgba(201,168,76,0.12), transparent 28%), #090909",
      }}
    >
      <style>
        {`
          @keyframes vtFloatSlow {
            0% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.52; }
            50% { transform: translate3d(18px, -20px, 0) scale(1.08); opacity: 0.82; }
            100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.52; }
          }
          @keyframes vtPulseText {
            0%, 100% { opacity: 0.45; transform: translateY(0); }
            50% { opacity: 1; transform: translateY(-4px); }
          }
          @keyframes vtSlideGlow {
            0% { transform: translateX(-12%); opacity: 0.15; }
            50% { transform: translateX(10%); opacity: 0.28; }
            100% { transform: translateX(-12%); opacity: 0.15; }
          }
          .vt-media-panel { position: relative; width: 100%; height: 100%; overflow: hidden; color: #f6efe4; }
          .vt-media-backdrop {
            position: absolute;
            inset: 0;
            background:
              radial-gradient(circle at 18% 22%, rgba(201,168,76,0.12), transparent 30%),
              radial-gradient(circle at 78% 18%, rgba(255,255,255,0.1), transparent 22%),
              radial-gradient(circle at 60% 68%, rgba(201,168,76,0.12), transparent 24%),
              linear-gradient(130deg, rgba(13,13,13,1) 0%, rgba(18,15,11,1) 42%, rgba(10,10,10,1) 100%);
          }
          .vt-media-backdrop::before, .vt-media-backdrop::after {
            content: "";
            position: absolute;
            border-radius: 999px;
            filter: blur(32px);
            animation: vtFloatSlow 11s ease-in-out infinite;
          }
          .vt-media-backdrop::before { top: 12%; right: 9%; width: 220px; height: 220px; background: rgba(201,168,76,0.18); }
          .vt-media-backdrop::after { bottom: 8%; left: 14%; width: 290px; height: 290px; background: rgba(255,255,255,0.08); animation-delay: -5s; }
          .vt-media-shell { position: relative; z-index: 1; width: 100%; height: 100%; padding: 44px; display: flex; flex-direction: column; justify-content: space-between; }
          .vt-media-meta { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
          .vt-media-step { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(201,168,76,0.86); font-weight: 700; margin-bottom: 12px; }
          .vt-media-title { font-family: "Syne", sans-serif; font-size: 54px; line-height: 0.95; letter-spacing: -0.06em; margin: 0; max-width: 470px; }
          .vt-media-subtitle { margin-top: 16px; max-width: 420px; font-size: 17px; line-height: 1.65; color: rgba(246,239,228,0.7); }
          .vt-media-badges { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; max-width: 280px; }
          .vt-media-badge { border-radius: 999px; padding: 10px 14px; font-size: 12px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: rgba(246,239,228,0.82); backdrop-filter: blur(10px); animation: vtPulseText 7s ease-in-out infinite; }
          .vt-media-card { align-self: center; width: min(620px, 78%); border-radius: 28px; border: 1px solid rgba(255,255,255,0.12); background: rgba(12,12,12,0.52); backdrop-filter: blur(18px); box-shadow: 0 28px 80px rgba(0,0,0,0.42); position: relative; overflow: hidden; }
          .vt-media-card::before { content: ""; position: absolute; inset: -10% -20%; background: linear-gradient(110deg, transparent 0%, rgba(201,168,76,0.12) 38%, transparent 68%); animation: vtSlideGlow 10s linear infinite; }
          .vt-chip-cloud { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
          .vt-chip-cloud span { border-radius: 999px; padding: 9px 13px; background: rgba(201,168,76,0.14); border: 1px solid rgba(201,168,76,0.18); color: #f3e0a4; font-size: 12px; }
          .vt-hero-shell, .vt-setup-shell, .vt-profile-shell, .vt-message-window, .vt-media-stack { position: relative; z-index: 1; }
          .vt-media-card-signup { padding: 26px; }
          .vt-hero-title { font-family: "Syne", sans-serif; font-size: 34px; line-height: 1; letter-spacing: -0.05em; max-width: 360px; margin-bottom: 12px; }
          .vt-hero-note { color: rgba(246,239,228,0.62); font-size: 15px; line-height: 1.6; margin-bottom: 18px; }
          .vt-transcript-card { display: flex; align-items: center; gap: 12px; padding: 16px; border-radius: 18px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.08); color: #f7f1e7; line-height: 1.5; }
          .vt-media-card-permissions { padding: 18px; }
          .vt-media-toolbar { display: flex; gap: 8px; margin-bottom: 16px; position: relative; z-index: 1; }
          .vt-media-bullet { width: 8px; height: 8px; border-radius: 999px; background: rgba(255,255,255,0.32); }
          .vt-media-stack { display: grid; gap: 12px; }
          .vt-permission-row { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 18px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); }
          .vt-permission-icon { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 12px; color: #e6c76f; background: rgba(201,168,76,0.14); border: 1px solid rgba(201,168,76,0.18); flex-shrink: 0; }
          .vt-permission-copy div { font-size: 15px; font-weight: 700; color: #f7f1e7; }
          .vt-permission-copy span { display: block; margin-top: 4px; color: rgba(246,239,228,0.56); font-size: 13px; }
          .vt-media-card-setup, .vt-media-card-personalize { padding: 24px; }
          .vt-setup-head { font-family: "Syne", sans-serif; font-size: 30px; letter-spacing: -0.04em; margin-bottom: 16px; }
          .vt-setup-line { height: 1px; margin-bottom: 16px; background: linear-gradient(90deg, rgba(201,168,76,0.34), rgba(255,255,255,0.08)); }
          .vt-setup-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
          .vt-setup-grid div, .vt-profile-row { border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.05); padding: 14px 16px; color: rgba(246,239,228,0.82); }
          .vt-media-card-learn { padding: 22px; }
          .vt-message-window { border-radius: 26px; background: rgba(252,252,252,0.92); color: #181818; overflow: hidden; }
          .vt-message-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid rgba(0,0,0,0.08); font-size: 14px; }
          .vt-message-app { display: flex; align-items: center; gap: 10px; font-weight: 700; }
          .vt-message-body { padding: 22px 20px 0; }
          .vt-message-line { height: 10px; border-radius: 999px; background: rgba(0,0,0,0.1); margin-bottom: 12px; }
          .vt-long { width: 78%; }
          .vt-mid { width: 62%; }
          .vt-short { width: 48%; }
          .vt-message-output { margin: 16px 20px 22px; padding: 16px; border-radius: 18px; background: rgba(201,168,76,0.14); color: #26210f; font-size: 18px; line-height: 1.5; }
          .vt-profile-shell { display: grid; gap: 12px; }
          .vt-profile-row { display: flex; justify-content: space-between; gap: 14px; font-size: 14px; }
          .vt-profile-row span { color: rgba(246,239,228,0.6); }
          .vt-profile-row strong { color: #f7f1e7; font-weight: 700; }
        `}
      </style>

      <div className="vt-media-panel">
        <div className="vt-media-backdrop" />
        <div className="vt-media-shell">
          <div className="vt-media-meta">
            <div>
              <div className="vt-media-step">{step.media.kicker}</div>
              <h2 className="vt-media-title">{step.media.title}</h2>
              <div className="vt-media-subtitle">{step.media.subtitle}</div>
            </div>
            <div className="vt-media-badges">
              {step.media.badges.map((badge, index) => (
                <div
                  key={`${step.id}-${badge}`}
                  className="vt-media-badge"
                  style={{ animationDelay: `${index * 0.55}s` }}
                >
                  {badge}
                </div>
              ))}
            </div>
          </div>

          {renderStepCard(step)}
        </div>
      </div>
    </section>
  );
};
