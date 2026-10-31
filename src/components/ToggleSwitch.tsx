import React, { useState } from 'react';

interface ToggleSwitchProps {
  /** Unique identifier for the pin */
  pinId: string;
  /** Initial boolean value */
  defaultOn?: boolean;
  /** Callback when toggled */
  onChange?: (pinId: string, on: boolean) => void;
}

/**
 * A reusable toggle switch rendered inline on an IC base.
 * It displays a small sliding switch that can be turned on/off.
 * The component is styled using CSS variables defined in ui.css.
 */
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ pinId, defaultOn = false, onChange }) => {
  const [isOn, setIsOn] = useState(defaultOn);

  const handleToggle = () => {
    const newState = !isOn;
    setIsOn(newState);
    if (onChange) {
      onChange(pinId, newState);
    }
  };

  return (
    <div className="toggle-switch" onClick={handleToggle} title={`Toggle pin ${pinId}`}> 
      <div className={`switch-knob ${isOn ? 'on' : 'off'}`} />
    </div>
  );
};

export default ToggleSwitch;
