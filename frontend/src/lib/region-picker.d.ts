export function mountRegionPicker(host: HTMLElement, onChange?: (region: string) => void): {
  readonly value: string;
  setDisabled(disabled: boolean): void;
};
