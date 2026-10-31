export interface PanelState {
  open: boolean;
  cameraId: string | null;
  selectedCameraName: string;
}

export type PanelAction =
  | { type: "open"; cameraId: string; name: string }
  | { type: "close" }
  | { type: "toggle"; cameraId: string; name: string };

export const initialPanelState: PanelState = {
  open: false,
  cameraId: null,
  selectedCameraName: "",
};

export function panelReducer(state: PanelState, action: PanelAction): PanelState {
  switch (action.type) {
    case "open":
      return { open: true, cameraId: action.cameraId, selectedCameraName: action.name };
    case "close":
      return { open: false, cameraId: null, selectedCameraName: "" };
    case "toggle": {
      if (state.open && state.cameraId === action.cameraId) {
        return { open: false, cameraId: null, selectedCameraName: "" };
      }
      return { open: true, cameraId: action.cameraId, selectedCameraName: action.name };
    }
    default:
      return state;
  }
}
