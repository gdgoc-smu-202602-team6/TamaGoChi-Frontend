// UI model only. Map the eventual backend response to this shape in the service layer.
export type HomeOverview = {
  readonly profile: {
    readonly nickname: string;
    readonly bolt: number;
    readonly level: number;
    readonly hearts: number;
  };
  readonly room: {
    readonly name: string;
    readonly characterLabel: string;
  };
  // The service provides the total for the KST 04:00 service day.
  readonly todayStudySeconds: number;
  readonly attendance: {
    readonly studySeconds: number;
    readonly requiredSeconds: number;
    readonly achieved: boolean;
  };
  readonly bugs: {
    readonly count: number;
    // Progress toward the next removal; may include time from earlier service days.
    readonly progressSeconds: number;
    readonly requiredSeconds: number;
  };
};

export type HomeService = {
  getHome: () => Promise<HomeOverview>;
};
