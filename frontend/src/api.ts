/** Autitic Studio API Client */

export interface Channel {
  id: string;
  name: string;
  slug: string;
  color: string;
  default_profile_id?: string;
  project_count: number;
}

export interface Profile {
  id: string;
  channel_id: string;
  name: string;
  is_default: boolean;
  script_config: Record<string, any>;
  tts_config: Record<string, any>;
  cut_config: Record<string, any>;
  image_motion_config: Record<string, any>;
  render_config: Record<string, any>;
}

export interface ProjectSummary {
  id: string;
  channel_id: string;
  title: string;
  stage: string;
  aspect_ratio: string;
  profile_id?: string;
  profile_name?: string;
  shot_count: number;
  duration_s: number;
  updated_at: string;
}


export interface ModelItem {
  id: string;
  name: string;
  label: string;
  category: string;
  size_mb: number;
  installed: boolean;
  is_default: boolean;
  is_optional: boolean;
  description: string;
}

const API_BASE = "";

export const api = {
  // Channels
  async getChannels(): Promise<Channel[]> {
    const res = await fetch(`${API_BASE}/channels`);
    return res.json();
  },
  async createChannel(name: string, color = "emerald"): Promise<Channel> {
    const res = await fetch(`${API_BASE}/channels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    return res.json();
  },

  // Profiles
  async getProfiles(channelId: string): Promise<Profile[]> {
    const res = await fetch(`${API_BASE}/profiles/channel/${channelId}`);
    return res.json();
  },
  async createProfile(data: Partial<Profile>): Promise<Profile> {
    const res = await fetch(`${API_BASE}/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateProfile(profileId: string, data: Partial<Profile>): Promise<Profile> {
    const res = await fetch(`${API_BASE}/profiles/${profileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async cloneProfile(profileId: string, newName?: string): Promise<Profile> {
    const params = new URLSearchParams();
    if (newName) params.set("new_name", newName);
    const res = await fetch(`${API_BASE}/profiles/${profileId}/clone?${params.toString()}`, { method: "POST" });
    return res.json();
  },
  async cloneDefaultProfile(channelId: string, newName?: string): Promise<Profile> {
    const params = new URLSearchParams();
    if (newName) params.set("new_name", newName);
    const res = await fetch(`${API_BASE}/profiles/channel/${channelId}/clone_default?${params.toString()}`, { method: "POST" });
    return res.json();
  },

  // Projects
  async getProjects(channelId: string, stage?: string, query?: string): Promise<ProjectSummary[]> {
    const params = new URLSearchParams();
    if (stage && stage !== "all") params.set("stage", stage);
    if (query) params.set("query", query);
    const res = await fetch(`${API_BASE}/projects/channel/${channelId}?${params.toString()}`);
    return res.json();
  },
  async createProject(channelId: string, title: string, aspect = "9:16"): Promise<ProjectSummary> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel_id: channelId, title, aspect_ratio: aspect }),
    });
    return res.json();
  },
  async deleteProject(projectId: string): Promise<void> {
    await fetch(`${API_BASE}/projects/${projectId}`, { method: "DELETE" });
  },
  async updateProject(projectId: string, data: Partial<ProjectSummary>): Promise<ProjectSummary> {
    const res = await fetch(`${API_BASE}/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Rooms Pipeline

  async getArtifacts(projectId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/artifacts`);
    return res.json();
  },
  async buildIdea(projectId: string, ideaData: any): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/idea`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ideaData),
    });
    return res.json();
  },
  async buildStory(projectId: string, storyData?: any): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/story`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(storyData || null),
    });
    return res.json();
  },
  async saveStory(projectId: string, storyData: any): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/story`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(storyData),
    });
    return res.json();
  },
  async buildScript(projectId: string, payload?: any): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/script`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || null),
    });
    return res.json();
  },
  async saveScript(projectId: string, scriptData: any): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/script`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scriptData),
    });
    return res.json();
  },
  async selectVersion(projectId: string, step: string, version: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/${step}/versions/${version}/select`, { method: "POST" });
    return res.json();
  },
  async buildVoice(projectId: string, payload?: { voice_id?: string; speed?: number; pitch?: number; bgm_mood?: string; bgm_volume?: number }): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    return res.json();
  },
  async buildCut(projectId: string, energy?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/cut`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ energy }),
    });
    return res.json();
  },
  async saveCut(projectId: string, cutData: any): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/cut`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cutData),
    });
    return res.json();
  },
  async buildImages(projectId: string, payload?: { engine?: string; model?: string; colab_url?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/images`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Failed to generate images");
    }
    return res.json();
  },
  async rerollImage(projectId: string, index: number, payload?: { engine?: string; model?: string; colab_url?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/images/${index}/reroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Failed to reroll image");
    }
    return res.json();
  },
  async uploadShotImage(projectId: string, index: number, file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/images/${index}/upload`, {
      method: "POST",
      body: formData,
    });
    return res.json();
  },
  async synthesizeVisualPrompts(projectId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/images/synthesize-prompts`, {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Failed to synthesize visual prompts");
    }
    return res.json();
  },
  async updateShotPrompt(projectId: string, index: number, visualPrompt: string, cameraMotion?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/images/${index}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visual_prompt: visualPrompt, camera_motion: cameraMotion }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Failed to update shot prompt");
    }
    return res.json();
  },
  async buildMotion(projectId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/motion`, { method: "POST" });
    return res.json();
  },
  async renderVideo(projectId: string, note = ""): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    return res.json();
  },

  getAudioUrl(projectId: string, download = false, takeId?: string): string {
    const params = new URLSearchParams();
    if (download) params.set("download", "true");
    if (takeId) params.set("take_id", takeId);
    const qs = params.toString();
    return `${API_BASE}/projects/${projectId}/rooms/audio${qs ? `?${qs}` : ""}`;
  },
  getVideoUrl(projectId: string, download = false): string {
    return `${API_BASE}/projects/${projectId}/rooms/video${download ? "?download=true" : ""}`;
  },
  getMediaUrl(projectId: string, folder: string, filename: string): string {
    return `${API_BASE}/projects/${projectId}/rooms/media/${folder}/${filename}`;
  },
  async getAudioTakes(projectId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/audio/takes`);
    return res.json();
  },
  async restoreAudioTake(projectId: string, takeId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/rooms/audio/takes/${takeId}/restore`, {
      method: "POST",
    });
    return res.json();
  },

  // Settings

  async getModels(): Promise<ModelItem[]> {
    const res = await fetch(`${API_BASE}/settings/models`);
    return res.json();
  },
  async clearModelCache(modelId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/models/${modelId}/clear_cache`, { method: "POST" });
    return res.json();
  },
  async deleteModel(modelId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/models/${modelId}`, { method: "DELETE" });
    return res.json();
  },
  async downloadModel(modelId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/models/${modelId}/download`, { method: "POST" });
    return res.json();
  },
  async getColab(): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/colab`);
    return res.json();
  },
  async testColab(url: string, token = ""): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/colab/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, token }),
    });
    return res.json();
  },
  async saveColab(url: string, token = ""): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/colab`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, token }),
    });
    return res.json();
  },
  async getApiKeys(): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/api_keys`);
    return res.json();
  },
  async saveApiKeys(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/api_keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async getStorage(): Promise<any> {
    const res = await fetch(`${API_BASE}/settings/storage`);
    return res.json();
  },
};
