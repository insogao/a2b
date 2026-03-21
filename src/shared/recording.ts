export type RecordingEntry =
  | {
      kind: "click";
      selector: string;
      text?: string;
      url: string;
    }
  | {
      kind: "input";
      selector: string;
      value: string;
      url: string;
    }
  | {
      kind: "navigation";
      title: string;
      url: string;
    };
