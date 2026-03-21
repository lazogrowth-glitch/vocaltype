import React from "react";
import { useTranslation } from "react-i18next";
import { Slider } from "../ui/Slider";
import { useDebouncedSetting, useSettings } from "../../hooks/useSettings";

export const VolumeSlider: React.FC<{ disabled?: boolean }> = ({
  disabled = false,
}) => {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const audioFeedbackVolume = getSetting("audio_feedback_volume") ?? 0.5;
  const updateVolume = useDebouncedSetting("audio_feedback_volume", 150);

  return (
    <Slider
      value={audioFeedbackVolume}
      onChange={(value: number) => updateVolume(value)}
      min={0}
      max={1}
      step={0.1}
      label={t("settings.sound.volume.title")}
      description={t("settings.sound.volume.description")}
      descriptionMode="tooltip"
      grouped
      formatValue={(value) => `${Math.round(value * 100)}%`}
      disabled={disabled}
    />
  );
};
