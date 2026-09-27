export type ComponentType = 
  | 'helix' 
  | 'box_outline' 
  | 'sphere' 
  | 'ring' 
  | 'flow' 
  | 'radial_grid';

export interface SimulationComponent {
  id: string;
  label: string;
  sublabel?: string;
  type: ComponentType;
  center: [number, number, number];
  scale: [number, number, number];
  color?: string;
}

export interface ConnectionLink {
  fromId: string;
  toId: string;
  label?: string;
}

export interface SimulationSpec {
  title: string;
  subtitle?: string;
  voiceResponse: string;
  components: SimulationComponent[];
  connections?: ConnectionLink[];
}
