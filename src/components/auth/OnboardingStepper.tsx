import type { AuthStepContent } from "./authOnboardingContent";

interface OnboardingStepperProps {
  steps: AuthStepContent[];
  currentStep: AuthStepContent["id"];
  onStepSelect: (step: AuthStepContent["id"]) => void;
}

export const OnboardingStepper = ({
  steps,
  currentStep,
  onStepSelect,
}: OnboardingStepperProps) => {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1040,
        display: "grid",
        gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
        alignItems: "center",
        gap: 14,
      }}
    >
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isComplete =
          steps.findIndex((item) => item.id === currentStep) > index;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepSelect(step.id)}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              color: isActive
                ? "#F5EEE4"
                : isComplete
                  ? "rgba(201,168,76,0.92)"
                  : "rgba(243,236,223,0.45)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              padding: 0,
            }}
          >
            <span>{step.navLabel}</span>
            {index < steps.length - 1 ? (
              <span style={{ opacity: 0.42, transform: "translateY(-1px)" }}>
                &gt;
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};
