declare module 'react-sparklines' {
  import { ReactNode, ComponentType } from 'react';

  export interface SparklinesProps {
    data?: number[];
    limit?: number;
    width?: number;
    height?: number;
    svgWidth?: number;
    svgHeight?: number;
    preserveAspectRatio?: string;
    margin?: number;
    min?: number;
    max?: number;
    style?: React.CSSProperties;
    children?: ReactNode;
  }

  export interface SparklinesLineProps {
    color?: string;
    style?: React.CSSProperties;
    onMouseMove?: (event: any) => void;
  }

  export interface SparklinesSpotProps {
    size?: number;
    style?: React.CSSProperties;
    spotColors?: {
      [key: string]: string;
    };
  }

  export const Sparklines: ComponentType<SparklinesProps>;
  export const SparklinesLine: ComponentType<SparklinesLineProps>;
  export const SparklinesSpots: ComponentType<SparklinesSpotProps>;
} 