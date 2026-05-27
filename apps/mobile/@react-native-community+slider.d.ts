declare module '@react-native-community/slider' {
  import React from 'react';
  import { ViewProps } from 'react-native';

  interface SliderProps extends ViewProps {
    style?: any;
    step?: number;
    minimumValue?: number;
    maximumValue?: number;
    minimumTrackTintColor?: string;
    maximumTrackTintColor?: string;
    value?: number;
    onValueChange?: (value: number) => void;
    onSlidingStart?: (value: number) => void;
    onSlidingComplete?: (value: number) => void;
    thumbTintColor?: string;
  }

  const Slider: React.FC<SliderProps>;
  export default Slider;
}
