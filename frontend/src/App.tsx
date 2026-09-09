import React, { useState, useEffect, useRef } from "react";
import {
  api,
  type Channel,
  type Profile,
  type ProjectSummary,
  type ModelItem,
} from "./api";
import {
  Sparkles,
  Film,
  Settings,
  Plus,
  Sliders,
  ChevronDown,
  RefreshCw,
  Folder,
  Key,
  Cpu,
  LogOut,
  ArrowRight,
  Play,
  Trash2,
  Download,
  Loader2,
  CheckCircle,
  Volume2,
  Scissors,
  Layers,
  Video,
  Maximize2,
  Save,
  History,
  Check,
  Zap,
  ExternalLink,
  Monitor,
  ChevronLeft,
  ChevronRight,
  X,
  Eye,
} from "lucide-react";

export default function App() {
  // State
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectSummary | null>(null);
  const [artifacts, setArtifacts] = useState<any>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);

  // Filters & Navigation
  const [stageFilter, setStageFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRoom, setActiveRoom] = useState(1);

  // Room 1 Sub-tier Navigation (1: Idea, 2: Story, 3: Script)
  const [scriptSubTier, setScriptSubTier] = useState<"idea" | "story" | "script">("idea");

  // Idea & Story Forms
  const [ideaForm, setIdeaForm] = useState<any>({
    premise: "A tired merchant's hats are stolen by monkeys in a banyan tree, and he outsmarts them through mimicry.",
    source: "Classic Indian Panchatantra moral fable.",
    tone: "playful, witty, cinematic fable",
    pattern: "fable",
    audience: "Kids and families",
    target_seconds: 60,
    scene_count: 5,
  });

  const [storyForm, setStoryForm] = useState<any>({
    title: "The Hat Seller and the Monkeys",
    logline: "When mischievous jungle monkeys steal all his wares, a tired merchant outsmarts them with a brilliant display of reverse psychology.",
    core_message: "Patience and understanding your opponent's nature can solve what anger never will.",
    hook: "Deep in a tropical forest, a tired hat vendor carrying a towering wicker basket seeks refuge under an ancient banyan tree.",
    arc: [
      "The vendor sets his basket down and drifts into a weary slumber beneath the cool leaves.",
      "Dozens of playful monkeys scamper down the branches, quietly snatching every colorful hat.",
      "The vendor awakens to find his basket empty, gazing up in horror at the grinning troop wearing his hats.",
      "Frustrated, he shouts and shakes his fists, only for the monkeys to mirror every angry gesture.",
      "Realizing their mimicry, the clever merchant rips his own cap off and hurls it dramatically to the earth.",
      "Instantly, every monkey copies him, hurling dozens of hats raining down from the canopy.",
      "The merchant quickly gathers his wares with a knowing smile and journeys safely on."
    ],
    setting: "Dense sun-dappled jungle road under an ancient banyan tree",
    characters: ["The Hat Seller (worn cotton clothes, weathered face)", "Troop of mischievous macaques"],
    payoff: "A flurry of colorful caps cascading down onto the forest floor as mimicry turns against the thieves.",
    callback: "A quiet tip of the hat to the jungle as the seller departs with all his merchandise intact.",
  });

  // Modals & Popovers
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showFullUserSettings, setShowFullUserSettings] = useState(false);
  const [userSettingsTab, setUserSettingsTab] = useState<"profiles" | "models" | "api" | "storage">("profiles");
  const [profileEditorTab, setProfileEditorTab] = useState<"script" | "tts" | "image" | "motion" | "render">("script");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showColabModal, setShowColabModal] = useState(false);
  const [channelDropdown, setChannelDropdown] = useState(false);

  // Models, Telemetry & Settings
  const [models, setModels] = useState<ModelItem[]>([]);
  const [colabConfig, setColabConfig] = useState({ url: "https://autitic-wan2gp.trycloudflare.com", token: "" });
  const [colabStatus, setColabStatus] = useState<any>({ online: true, gpu_name: "A100-SXM4", vram_used_gb: 14.2, vram_total_gb: 40.0, latency_ms: 28 });
  const [apiKeys, setApiKeys] = useState<any>({ deepseek_api_key: "", openai_api_key: "", ollama_base_url: "http://127.0.0.1:11434/v1", llm_provider: "deepseek" });
  const [storageInfo, setStorageInfo] = useState<any>({});

  // Granular Loading States
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isSavingIdea, setIsSavingIdea] = useState(false);
  const [isSynthesizingVoice, setIsSynthesizingVoice] = useState(false);
  const [isComputingCut, setIsComputingCut] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isPlanningMotion, setIsPlanningMotion] = useState(false);
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [rerollingShotIdx, setRerollingShotIdx] = useState<number | null>(null);
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null);

  // Audio & Room Media Timestamps & State
  const [audioTimestamp, setAudioTimestamp] = useState(Date.now());
  const [imagesTimestamp, setImagesTimestamp] = useState(Date.now());
  const [motionTimestamp, setMotionTimestamp] = useState(Date.now());
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState("en-US-ChristopherNeural");
  const [selectedSpeed, setSelectedSpeed] = useState(1.05);
  const [selectedPitch, setSelectedPitch] = useState(0);
  const [selectedBgm, setSelectedBgm] = useState("cinematic");
  const [selectedBgmVolume, setSelectedBgmVolume] = useState(0.15);
  const [videoTimestamp, setVideoTimestamp] = useState(Date.now());
  const [activeParallaxShot, setActiveParallaxShot] = useState(1);
  const [parallaxTilt, setParallaxTilt] = useState({ x: 0, y: 0 });
  const [isSavingStory, setIsSavingStory] = useState(false);
  const [isSavingScript, setIsSavingScript] = useState(false);
  const [isSavingCut, setIsSavingCut] = useState(false);
  const [uploadingShotIdx, setUploadingShotIdx] = useState<number | null>(null);
  const [motionMode, setMotionMode] = useState<"parallax_2.5d" | "colab_wan2gp">("parallax_2.5d");
  const [imageEngine, setImageEngine] = useState<"local" | "colab">("local");
  const [isTestingColab, setIsTestingColab] = useState(false);
  const [audioTakes, setAudioTakes] = useState<any[]>([]);
  const [selectedTakeId, setSelectedTakeId] = useState<string>("");
  const [jobQueue, setJobQueue] = useState<{ id: string; label: string; room: number; status: "running" | "queued" }[]>([]);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [modalNotice, setModalNotice] = useState<{ title?: string; message: string; type?: "info" | "error" | "success" } | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [lightboxShotIdx, setLightboxShotIdx] = useState<number | null>(null);
  const [isDirectingVisuals, setIsDirectingVisuals] = useState(false);

  const showAlert = (message: string, type: "info" | "error" | "success" = "info", title?: string) => {
    setCopiedNotice(false);
    setModalNotice({ message, type, title: title || (type === "error" ? "Error" : type === "success" ? "Success" : "Notification") });
  };

  // Keyboard navigation for full-screen Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxShotIdx === null) return;
      if (e.key === "Escape") {
        setLightboxShotIdx(null);
      } else if (e.key === "ArrowLeft" && lightboxShotIdx > 1) {
        setLightboxShotIdx(lightboxShotIdx - 1);
      } else if (e.key === "ArrowRight") {
        const total = artifacts.shots?.shots?.length || artifacts.images?.length || 10;
        if (lightboxShotIdx < total) {
          setLightboxShotIdx(lightboxShotIdx + 1);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxShotIdx, artifacts]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);


  // Load Initial Data
  useEffect(() => {
    api.getChannels().then((data) => {
      setChannels(data);
      if (data.length > 0) setActiveChannel(data[0]);
    });
    api.getModels().then(setModels);
    api.getColab().then((res) => {
      if (res.config) setColabConfig(res.config);
      if (res.status) setColabStatus(res.status);
    });
    api.getApiKeys().then(setApiKeys);
    api.getStorage().then(setStorageInfo);
  }, []);

  // Load Projects & Profiles when channel changes
  useEffect(() => {
    if (!activeChannel) return;
    loadProjects();
    loadChannelProfiles();
  }, [activeChannel, stageFilter]);

  const loadChannelProfiles = async () => {
    if (!activeChannel) return;
    const pList = await api.getProfiles(activeChannel.id);
    setProfiles(pList);
    const def = pList.find((p) => p.is_default) || pList[0] || null;
    setActiveProfile(def);
  };

  const loadProjects = async () => {
    if (!activeChannel) return;
    const list = await api.getProjects(activeChannel.id, stageFilter, searchQuery);
    setProjects(list);
    if (list.length > 0 && !activeProject) {
      selectProject(list[0]);
    }
  };

  const selectProject = async (p: ProjectSummary | null) => {
    setActiveProject(p);
    if (!p) {
      setArtifacts({});
      return;
    }
    const arts = await api.getArtifacts(p.id);
    setArtifacts(arts);
    if (arts.idea) setIdeaForm((prev: any) => ({ ...prev, ...arts.idea }));
    if (arts.story) setStoryForm(arts.story);

    try {
      const takes = await api.getAudioTakes(p.id);
      setAudioTakes(takes || []);
      if (takes && takes.length > 0) {
        setSelectedTakeId(takes[takes.length - 1].take_id);
      } else {
        setSelectedTakeId("");
      }
    } catch (_) {
      setAudioTakes([]);
    }
  };

  const createNewProject = async () => {
    if (!activeChannel) return;
    const title = prompt("Enter project title:", "The Hat Seller and the Monkeys");
    if (!title) return;
    const newP = await api.createProject(activeChannel.id, title);
    setProjects([newP, ...projects]);
    selectProject(newP);
  };

  const handleDeleteProject = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      await api.deleteProject(id);
      const remaining = projects.filter((p) => p.id !== id);
      setProjects(remaining);
      if (activeProject?.id === id) {
        selectProject(remaining[0] || null);
      }
    }
  };

  // ROOM 1 ACTIONS WITH EXPLICIT SPINNERS & LOADING
  const handleSaveIdea = async () => {
    if (!activeProject) return;
    setIsSavingIdea(true);
    try {
      const res = await api.buildIdea(activeProject.id, ideaForm);
      const updated = await api.getArtifacts(activeProject.id);
      setArtifacts(updated);
      alert(`Idea saved! (Version ${res.version})`);
    } finally {
      setIsSavingIdea(false);
    }
  };

  const handleGenerateStory = async () => {
    if (!activeProject) return;
    setIsGeneratingStory(true);
    try {
      await api.buildIdea(activeProject.id, ideaForm);
      const story = await api.buildStory(activeProject.id);
      setStoryForm(story);
      const updated = await api.getArtifacts(activeProject.id);
      setArtifacts(updated);
      setScriptSubTier("story");
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!activeProject) return;
    setIsGeneratingScript(true);
    try {
      await api.buildStory(activeProject.id, storyForm);
      await api.buildScript(activeProject.id);
      const updated = await api.getArtifacts(activeProject.id);
      setArtifacts(updated);
      setScriptSubTier("script");
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const handleVersionSwitch = async (step: string, version: string) => {
    if (!activeProject) return;
    await api.selectVersion(activeProject.id, step, version);
    const updated = await api.getArtifacts(activeProject.id);
    setArtifacts(updated);
  };

  // MANUAL EDITS & REFINEMENT HANDLERS
  const handleSaveStoryEdits = async () => {
    if (!activeProject) return;
    setIsSavingStory(true);
    try {
      await api.saveStory(activeProject.id, storyForm);
      const updated = await api.getArtifacts(activeProject.id);
      setArtifacts(updated);
      alert("Story Treatment changes saved to disk!");
    } catch (e: any) {
      alert(`Save error: ${e.message || e}`);
    } finally {
      setIsSavingStory(false);
    }
  };

  const handleSaveScriptEdits = async () => {
    if (!activeProject || !artifacts.script) return;
    setIsSavingScript(true);
    try {
      await api.saveScript(activeProject.id, artifacts.script);
      const updated = await api.getArtifacts(activeProject.id);
      setArtifacts(updated);
      alert("Script beats saved successfully!");
    } catch (e: any) {
      alert(`Save error: ${e.message || e}`);
    } finally {
      setIsSavingScript(false);
    }
  };

  const handleSaveCutEdits = async () => {
    if (!activeProject || !artifacts.shots) return;
    setIsSavingCut(true);
    try {
      await api.saveCut(activeProject.id, artifacts.shots);
      const updated = await api.getArtifacts(activeProject.id);
      setArtifacts(updated);
      alert("Cut timeline saved successfully!");
    } catch (e: any) {
      alert(`Save error: ${e.message || e}`);
    } finally {
      setIsSavingCut(false);
    }
  };

  const handleSplitShot = async (shotIdx: number) => {
    if (!activeProject || !artifacts.shots?.shots) return;
    const shot = artifacts.shots.shots.find((s: any) => s.index === shotIdx);
    if (!shot || shot.duration < 1.0) {
      alert("Shot too short to split (minimum 1.0s required)");
      return;
    }
    const mid = Number((shot.start + shot.duration / 2).toFixed(2));
    const words = shot.text ? shot.text.split(" ") : ["Scene", "Part"];
    const half = Math.max(1, Math.floor(words.length / 2));
    const text1 = words.slice(0, half).join(" ");
    const text2 = words.slice(half).join(" ") || text1;

    const newShots: any[] = [];
    let idxCounter = 1;
    for (const s of artifacts.shots.shots) {
      if (s.index === shotIdx) {
        newShots.push({
          ...s,
          index: idxCounter++,
          end: mid,
          duration: Number((mid - s.start).toFixed(2)),
          text: text1,
        });
        newShots.push({
          ...s,
          index: idxCounter++,
          start: mid,
          duration: Number((s.end - mid).toFixed(2)),
          text: text2,
          camera_trajectory: s.camera_trajectory === "push_in" ? "pan_left" : "push_in",
        });
      } else {
        newShots.push({ ...s, index: idxCounter++ });
      }
    }
    const updatedCut = {
      ...artifacts.shots,
      shot_count: newShots.length,
      shots: newShots,
    };
    await api.saveCut(activeProject.id, updatedCut);
    const updated = await api.getArtifacts(activeProject.id);
    setArtifacts(updated);
  };

  const handleMergeShot = async (shotIdx: number) => {
    if (!activeProject || !artifacts.shots?.shots) return;
    const curIdx = artifacts.shots.shots.findIndex((s: any) => s.index === shotIdx);
    if (curIdx < 0 || curIdx >= artifacts.shots.shots.length - 1) {
      alert("No adjacent next shot to merge with");
      return;
    }
    const s1 = artifacts.shots.shots[curIdx];
    const s2 = artifacts.shots.shots[curIdx + 1];

    const merged = {
      ...s1,
      end: s2.end,
      duration: Number((s2.end - s1.start).toFixed(2)),
      text: `${s1.text} ${s2.text}`,
      visual_note: s1.visual_note || s2.visual_note,
    };

    const newShots: any[] = [];
    let idxCounter = 1;
    for (let i = 0; i < artifacts.shots.shots.length; i++) {
      if (i === curIdx) {
        newShots.push({ ...merged, index: idxCounter++ });
        i++; // skip next
      } else {
        newShots.push({ ...artifacts.shots.shots[i], index: idxCounter++ });
      }
    }
    const updatedCut = {
      ...artifacts.shots,
      shot_count: newShots.length,
      shots: newShots,
    };
    await api.saveCut(activeProject.id, updatedCut);
    const updated = await api.getArtifacts(activeProject.id);
    setArtifacts(updated);
  };

  const handleUploadImageClick = (shotIdx: number) => {
    setUploadingShotIdx(shotIdx);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeProject || uploadingShotIdx === null || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    try {
      await api.uploadShotImage(activeProject.id, uploadingShotIdx, file);
      const updated = await api.getArtifacts(activeProject.id);
      setArtifacts(updated);
      setImagesTimestamp(Date.now());
      setMotionTimestamp(Date.now());
      alert(`Custom illustration uploaded for Shot #${uploadingShotIdx}!`);
    } catch (err: any) {
      alert(`Image upload error: ${err.message || err}`);
    } finally {
      setUploadingShotIdx(null);
    }
  };

  // ROOM 2-6 ACTIONS
  const handleBuildVoice = async () => {
    if (!activeProject) return;
    setIsSynthesizingVoice(true);
    setJobQueue([{ id: "voice", label: "Voiceover & BGM Master Mix", room: 2, status: "running" }]);
    try {
      await api.buildVoice(activeProject.id, {
        voice_id: selectedVoice,
        speed: selectedSpeed,
        pitch: selectedPitch,
        bgm_mood: selectedBgm,
        bgm_volume: selectedBgmVolume,
      });
      const updated = await api.getArtifacts(activeProject.id);
      setArtifacts(updated);
      setAudioTimestamp(Date.now());
      const updatedTakes = await api.getAudioTakes(activeProject.id);
      setAudioTakes(updatedTakes || []);
      if (updatedTakes && updatedTakes.length > 0) {
        setSelectedTakeId(updatedTakes[updatedTakes.length - 1].take_id);
      }
    } catch (e: any) {
      alert(`Voice synthesis notice: ${e.message || e}`);
    } finally {
      setIsSynthesizingVoice(false);
      setJobQueue([]);
    }
  };

  const handleSwitchAudioTake = (takeId: string) => {
    setSelectedTakeId(takeId);
    setAudioTimestamp(Date.now());
  };

  const handleRestoreAudioTake = async (takeId: string) => {
    if (!activeProject) return;
    try {
      await api.restoreAudioTake(activeProject.id, takeId);
      const updated = await api.getArtifacts(activeProject.id);
      setArtifacts(updated);
      const updatedTakes = await api.getAudioTakes(activeProject.id);
      setAudioTakes(updatedTakes || []);
      setSelectedTakeId(takeId);
      setAudioTimestamp(Date.now());
      alert(`Restored ${takeId} as active master track!`);
    } catch (err: any) {
      alert(`Failed to restore audio take: ${err.message || err}`);
    }
  };

  const handleBuildCut = async (energy = "normal") => {
    if (!activeProject) return;
    setIsComputingCut(true);
    setJobQueue([{ id: "cut", label: "Shot Timing & Dynamic Cut Assembly", room: 3, status: "running" }]);
    try {
      await api.buildCut(activeProject.id, energy);
      const updated = await api.getArtifacts(activeProject.id);
      setArtifacts(updated);
    } finally {
      setIsComputingCut(false);
      setJobQueue([]);
    }
  };

  const handleAutoDirectVisuals = async () => {
    if (!activeProject) return;
    setIsDirectingVisuals(true);
    try {
      await api.synthesizeVisualPrompts(activeProject.id);
      const updated = await api.getArtifacts(activeProject.id);
      setArtifacts(updated);
      showAlert("✨ AI Visual Director synthesized visual scene prompts and camera motion tags for all cuts!", "success", "Visual Direction Complete");
    } catch (err: any) {
      showAlert(`Visual direction notice: ${err.message || err}`, "error");
    } finally {
      setIsDirectingVisuals(false);
    }
  };

  const handleUpdateShotPrompt = async (shotIdx: number, newPrompt: string, cameraMotion?: string) => {
    if (!activeProject) return;
    try {
      await api.updateShotPrompt(activeProject.id, shotIdx, newPrompt, cameraMotion);
      if (artifacts.shots?.shots) {
        const newShots = artifacts.shots.shots.map((s: any) =>
          s.index === shotIdx ? { ...s, visual_prompt: newPrompt, camera_motion: cameraMotion || s.camera_motion } : s
        );
        setArtifacts({ ...artifacts, shots: { ...artifacts.shots, shots: newShots } });
      }
    } catch (err) {
      console.error("Failed to update shot prompt:", err);
    }
  };

  const handleBuildImages = async () => {
    if (!activeProject) return;
    setIsGeneratingImages(true);
    const engineLabel = imageEngine === "colab" ? "⚡ Colab SDXL-Turbo" : "💻 Local Animagine XL";
    setJobQueue([{ id: "images", label: `Visual Generation (${engineLabel})`, room: 4, status: "running" }]);
    try {
      await api.buildImages(activeProject.id, {
        engine: imageEngine,
        model: imageEngine === "colab" ? "sdxl-turbo" : "animagine-xl",
        colab_url: colabConfig.url,
      });
      const updated = await api.getArtifacts(activeProject.id);
      setArtifacts(updated);
      setImagesTimestamp(Date.now());
    } catch (err: any) {
      showAlert(`Generation Error: ${err.message || err}`, "error");
    } finally {
      setIsGeneratingImages(false);
      setJobQueue([]);
    }
  };

  const handleRerollImage = async (shotIdx: number) => {
    if (!activeProject) return;
    setRerollingShotIdx(shotIdx);
    try {
      await api.rerollImage(activeProject.id, shotIdx, {
        engine: imageEngine,
        model: imageEngine === "colab" ? "sdxl-turbo" : "animagine-xl",
        colab_url: colabConfig.url,
      });
      const updated = await api.getArtifacts(activeProject.id);
      setArtifacts(updated);
      setImagesTimestamp(Date.now());
    } catch (err: any) {
      showAlert(`Re-roll Error: ${err.message || err}`, "error");
    } finally {
      setRerollingShotIdx(null);
    }
  };

  const handlePingColab = async () => {
    setIsTestingColab(true);
    try {
      const res = await api.testColab(colabConfig.url, colabConfig.token);
      setColabStatus(res);
      if (res.online) {
        showAlert(`Connected to Colab GPU successfully!\nDevice: ${res.gpu_name}\nLatency: ${res.latency_ms}ms`, "success", "Colab GPU Connected");
      } else {
        showAlert(`Colab GPU unreachable at ${colabConfig.url}.\n\nDetails: ${res.error || "Connection timed out"}\n\nMake sure Step 3 of colab_wan2gp_server.ipynb is actively running on Google Colab without being interrupted.`, "error", "Colab Connection Failed");
      }
    } catch (err: any) {
      showAlert(`Colab test error: ${err.message || err}`, "error");
    } finally {
      setIsTestingColab(false);
    }
  };

  const handleBuildMotion = async () => {
    if (!activeProject) return;
    setIsPlanningMotion(true);
    try {
      await api.buildMotion(activeProject.id);
      const updated = await api.getArtifacts(activeProject.id);
      setArtifacts(updated);
      setMotionTimestamp(Date.now());
    } finally {
      setIsPlanningMotion(false);
    }
  };

  const handleRender = async () => {
    if (!activeProject) return;
    setIsRenderingVideo(true);
    try {
      const res = await api.renderVideo(activeProject.id, "Final Export Assembly");
      const updated = await api.getArtifacts(activeProject.id);
      setArtifacts(updated);
      setVideoTimestamp(Date.now());
      alert(`Video rendered successfully! File: ${res.file} (${(res.size_bytes / (1024 * 1024)).toFixed(2)} MB)`);
    } catch (err: any) {
      alert(`Render error: ${err.message || err}`);
    } finally {
      setIsRenderingVideo(false);
    }
  };

  const handleToggleAspectRatio = async () => {
    if (!activeProject) return;
    const newRatio = activeProject.aspect_ratio === "16:9" ? "9:16" : "16:9";
    await api.updateProject(activeProject.id, { aspect_ratio: newRatio });
    setActiveProject({ ...activeProject, aspect_ratio: newRatio });
    setProjects(projects.map((p) => (p.id === activeProject.id ? { ...p, aspect_ratio: newRatio } : p)));
  };

  const handleSelectProfileForProject = async (profileId: string) => {
    if (!activeProject) return;
    await api.updateProject(activeProject.id, { profile_id: profileId });
    const selected = profiles.find((p) => p.id === profileId);
    if (selected) {
      setActiveProfile(selected);
      const profAspect = selected.render_config?.aspect_ratio || "9:16";
      if (profAspect !== activeProject.aspect_ratio) {
        await api.updateProject(activeProject.id, { aspect_ratio: profAspect });
        setActiveProject({ ...activeProject, profile_id: profileId, profile_name: selected.name, aspect_ratio: profAspect });
      } else {
        setActiveProject({ ...activeProject, profile_id: profileId, profile_name: selected.name });
      }
      setIdeaForm((prev: any) => ({
        ...prev,
        tone: selected.script_config?.tone || prev.tone,
        pattern: selected.script_config?.pattern || prev.pattern,
        scene_count: selected.script_config?.beat_target || prev.scene_count || 5,
        target_seconds: selected.script_config?.target_duration_s || prev.target_seconds || 60,
      }));
    }
    loadProjects();
  };


  // Model Management Actions
  const handleDeleteModel = async (modelId: string) => {
    if (!confirm(`Delete model files for ${modelId} from disk cache?`)) return;
    setLoadingModelId(modelId);
    try {
      await api.deleteModel(modelId);
      const list = await api.getModels();
      setModels(list);
      alert("Model deleted from cache. Disk space reclaimed!");
    } finally {
      setLoadingModelId(null);
    }
  };

  const handleDownloadModel = async (modelId: string) => {
    setLoadingModelId(modelId);
    try {
      await api.downloadModel(modelId);
      const list = await api.getModels();
      setModels(list);
      alert(`Model ${modelId} downloaded successfully!`);
    } finally {
      setLoadingModelId(null);
    }
  };

  // Profile Management Actions
  const handleCreateClonedProfile = async () => {
    if (!activeChannel) return;
    const name = prompt("Enter profile name:", "Custom Fable Storyteller");
    if (!name) return;
    const cloned = await api.cloneDefaultProfile(activeChannel.id, name);
    await loadChannelProfiles();
    setActiveProfile(cloned);
    alert(`Created new profile "${cloned.name}" cloned from default profile!`);
  };

  const handleSaveActiveProfile = async () => {
    if (!activeProfile) return;
    await api.updateProfile(activeProfile.id, activeProfile);
    await loadChannelProfiles();
    alert(`Profile "${activeProfile.name}" saved!`);
  };

  const handleSetDefaultProfile = async (p: Profile) => {
    await api.updateProfile(p.id, { is_default: true });
    await loadChannelProfiles();
    alert(`"${p.name}" is now the channel default profile!`);
  };

  const currentRunningTask = isGeneratingStory
    ? "Generating Story Arc..."
    : isGeneratingScript
    ? "Generating Script Beats..."
    : isSavingIdea
    ? "Saving Idea..."
    : isSavingStory
    ? "Saving Story Changes..."
    : isSavingScript
    ? "Saving Script Edits..."
    : isSynthesizingVoice
    ? "Synthesizing Voiceover & Mixing BGM..."
    : isComputingCut
    ? "Computing Timing & Camera Cuts..."
    : isSavingCut
    ? "Saving Cut Timeline..."
    : isGeneratingImages
    ? "Rendering Shot Visuals..."
    : isDirectingVisuals
    ? "AI Visual Director Synthesizing Prompts..."
    : rerollingShotIdx !== null
    ? `Re-rolling Shot #${rerollingShotIdx}...`
    : uploadingShotIdx !== null
    ? `Uploading Shot #${uploadingShotIdx}...`
    : isPlanningMotion
    ? "Estimating Monocular Depth..."
    : isRenderingVideo
    ? "Rendering Final MP4 Video..."
    : null;

  // 1:1 Cut-to-Shot Alignment between Room 3 and Room 4
  const cutsList = artifacts.shots?.shots || [];
  const imagesList = artifacts.images || [];

  const combinedShots = cutsList.length > 0
    ? cutsList.map((cut: any) => {
        const img = imagesList.find((i: any) => i.index === cut.index);
        return {
          ...cut,
          image: img,
          hasImage: !!img?.exists,
          imageUrl: img ? `${api.getMediaUrl(activeProject?.id || '', "images", `shot_${String(cut.index).padStart(3, "0")}.png`)}?t=${imagesTimestamp}` : null,
          visual_prompt: cut.visual_prompt || img?.visual_prompt || cut.visual_note || cut.text,
          camera_motion: cut.camera_motion || img?.camera_motion || "slow cinematic push-in",
          elapsed_s: img?.elapsed_s,
          engine: img?.engine,
        };
      })
    : imagesList.map((img: any) => ({
        index: img.index,
        duration: img.duration,
        text: img.prompt,
        visual_prompt: img.visual_prompt || img.prompt,
        camera_motion: img.camera_motion || "slow cinematic push-in",
        image: img,
        hasImage: !!img.exists,
        imageUrl: `${api.getMediaUrl(activeProject?.id || '', "images", `shot_${String(img.index).padStart(3, "0")}.png`)}?t=${imagesTimestamp}`,
        elapsed_s: img.elapsed_s,
        engine: img.engine,
      }));

  const activeLightboxShot = combinedShots.find((s: any) => s.index === lightboxShotIdx);

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-gray-100 font-sans antialiased select-text overflow-hidden">
      {/* HEADER */}

      <header className="h-14 border-b border-gray-800 bg-gray-950/80 backdrop-blur px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-blue-500/30">
              A
            </div>
            <span className="font-bold tracking-tight text-white text-base">
              AUTITIC <span className="text-xs font-mono font-normal text-blue-400 px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800">STUDIO</span>
            </span>
          </div>

          <div className="h-5 w-px bg-gray-800" />

          {/* Channel Selector */}
          <div className="relative">
            <button
              onClick={() => setChannelDropdown(!channelDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 text-xs font-medium text-gray-200 transition"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-white">{activeChannel?.name || "Select Channel"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {channelDropdown && (
              <div className="absolute left-0 top-full mt-1.5 w-64 rounded-xl bg-gray-900 border border-gray-800 shadow-2xl p-1.5 z-50">
                <div className="px-2.5 py-1 text-[10px] font-semibold text-gray-400 uppercase">Channels</div>
                {channels.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveChannel(c);
                      setChannelDropdown(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-gray-800 text-xs flex items-center justify-between"
                  >
                    <span>{c.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{c.project_count} vids</span>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Center: Global Task Processing / Queue & Colab Status */}
        <div className="flex items-center gap-3">
          {currentRunningTask ? (
            <div
              onClick={() => setShowQueueModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/70 border border-amber-500/80 shadow-lg shadow-amber-950/60 text-xs text-amber-200 animate-pulse cursor-pointer hover:border-amber-400 transition"
              title="Click to view Active Job Queue"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white">Processing:</span>
                <span className="truncate max-w-xs">{currentRunningTask}</span>
                {jobQueue.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-900/90 text-[10px] text-amber-300 font-mono">
                    +{jobQueue.length} queued
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div
              onClick={() => setShowQueueModal(true)}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-[11px] text-gray-400 hover:border-gray-700 cursor-pointer transition"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-gray-300 font-medium">Pipeline Ready</span>
              <span className="text-gray-600">·</span>
              <span className="text-[10px] text-gray-500 font-mono">Queue Idle</span>
            </div>
          )}

          <button
            onClick={() => setShowColabModal(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition text-xs ${
              colabStatus.online
                ? "bg-emerald-950/40 border-emerald-500/60 hover:border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                : "bg-gray-900/60 border-gray-800 hover:border-gray-700"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                colabStatus.online ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-gray-500"
              }`}
            />
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className={`font-semibold ${colabStatus.online ? "text-emerald-200" : "text-gray-400"}`}>
                  Google Colab Wan2GP
                </span>
                <span
                  className={`px-1 py-0.2 rounded text-[10px] font-mono font-bold ${
                    colabStatus.online
                      ? "bg-emerald-900/80 text-emerald-300 border border-emerald-700/50"
                      : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {colabStatus.online ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
              <span className={`text-[10px] font-mono ${colabStatus.online ? "text-emerald-300/80" : "text-gray-500"}`}>
                {colabStatus.online
                  ? `${colabStatus.gpu_name} · ${colabStatus.vram_total_gb ? colabStatus.vram_total_gb + 'GB' : 'Active'}`
                  : "Local Engine Active"}
              </span>
            </div>
          </button>
        </div>

        {/* Right Controls & User Profile Menu */}
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setShowOnboarding(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/80 border border-blue-700/70 text-xs font-medium text-blue-300 hover:bg-blue-900 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Setup Wizard</span>
          </button>

          <button
            onClick={() => {
              setUserSettingsTab("models");
              setShowFullUserSettings(true);
            }}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
            title="Model Configurator & Hardware"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Avatar with Dropdown */}
          <div className="relative pl-2 border-l border-gray-800">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-800 transition"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow">
                AS
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-gray-950 border border-gray-800 shadow-2xl p-2 z-50 text-xs">
                <div className="px-3 py-2 border-b border-gray-800">
                  <div className="font-bold text-white">creator@autitic.ai</div>
                  <div className="text-[11px] text-gray-400">User ID: usr_admin</div>
                  <div className="text-[11px] text-emerald-400 mt-1">Channel: {activeChannel?.name}</div>
                </div>

                <div className="py-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setUserSettingsTab("profiles");
                      setShowFullUserSettings(true);
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-900 flex items-center gap-2 text-gray-200"
                  >
                    <Sliders className="w-3.5 h-3.5 text-blue-400" />
                    <span>Profile Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserSettingsTab("models");
                      setShowFullUserSettings(true);
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-900 flex items-center gap-2 text-gray-200"
                  >
                    <Settings className="w-3.5 h-3.5 text-indigo-400" />
                    <span>User Settings (Full Page)</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-gray-800">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      alert("Logged out of session. Welcome back, creator!");
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-950/40 text-red-400 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN VIEW */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR: 100+ PROJECTS */}
        <aside className="w-72 border-r border-gray-800 bg-gray-950 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Channel Projects</span>
              <button
                onClick={createNewProject}
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                New Video
              </button>
            </div>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                loadProjects();
              }}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            {/* Stage filter pills */}
            <div className="flex flex-wrap gap-1 pt-1">
              {["all", "idea", "story", "script", "cut", "images", "motion", "ready"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStageFilter(st)}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${
                    stageFilter === st
                      ? "bg-blue-900/60 text-blue-300 border border-blue-700"
                      : "bg-gray-900 text-gray-400 border border-gray-800 hover:text-gray-200"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Project List (With Delete Button & NO project-level version displayed) */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => selectProject(p)}
                className={`group p-2.5 rounded-lg border cursor-pointer transition relative ${
                  activeProject?.id === p.id
                    ? "border-blue-600/60 bg-blue-950/20"
                    : "border-gray-800/80 bg-gray-900/50 hover:bg-gray-800/60"
                }`}
              >
                <div className="flex items-start justify-between gap-1 pr-6">
                  <span className="font-semibold text-xs text-white leading-tight">{p.title}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 shrink-0 capitalize">
                    {p.stage}
                  </span>
                </div>

                {/* Delete Button (visible on hover) */}
                <button
                  onClick={(e) => handleDeleteProject(p.id, p.title, e)}
                  title="Delete project"
                  className="absolute right-2 top-2.5 p-1 rounded text-gray-500 hover:text-red-400 hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-800/50 text-[10px] text-gray-500 font-mono">
                  <span>{p.shot_count > 0 ? `${p.shot_count} shots · ${p.duration_s}s` : "Draft"}</span>
                  <span className="text-blue-400">{p.aspect_ratio}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* CENTER: 6-ROOM DECOUPLED PIPELINE */}
        <main className="flex-1 flex flex-col min-w-0 bg-black overflow-hidden">
          {/* Active Project Header Bar */}
          {activeProject && (
            <div className="h-12 border-b border-gray-800 bg-gray-950/80 px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-bold text-sm text-white truncate">{activeProject.title}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800 shrink-0">
                  Room {activeRoom} of 6
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {/* Profile Selector */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-500 font-medium">Profile:</span>
                  <select
                    value={activeProject.profile_id || activeProfile?.id || ""}
                    onChange={(e) => handleSelectProfileForProject(e.target.value)}
                    className="bg-gray-900 border border-gray-800 rounded px-2.5 py-1 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Aspect Ratio Toggle */}
                <button
                  onClick={handleToggleAspectRatio}
                  title="Toggle Aspect Ratio (9:16 Vertical vs 16:9 Wide)"
                  className="px-2.5 py-1 rounded bg-gray-900 border border-gray-800 hover:border-gray-700 text-xs font-mono font-bold text-blue-400 flex items-center gap-1.5 transition"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>{activeProject.aspect_ratio || "9:16"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Room Selection Tabs */}
          <div className="h-11 border-b border-gray-800 bg-gray-950 flex items-center px-4 gap-1 overflow-x-auto shrink-0">

            {[
              { num: 1, label: "Script & Beats" },
              { num: 2, label: "Voice & Audio" },
              { num: 3, label: "The Cut" },
              { num: 4, label: "Shot Images" },
              { num: 5, label: "Motion Engine" },
              { num: 6, label: "Assembly & Render" },
            ].map((room) => (
              <button
                key={room.num}
                onClick={() => setActiveRoom(room.num)}
                className={`flex items-center gap-2 py-2 px-3 border-b-2 text-xs font-medium transition ${
                  activeRoom === room.num
                    ? "border-blue-500 text-white font-semibold"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    activeRoom === room.num ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {room.num}
                </span>
                <span>{room.label}</span>
              </button>
            ))}
          </div>

          {/* Room Workspace Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* ROOM 1: 3-TIER MODULAR SCRIPT AUTHORING (IDEA -> STORY -> SCRIPT) */}
            {activeRoom === 1 && (
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Header & Sub-tier Tabs */}
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white">Room 1 · Modular Script & Story Studio</h2>
                    <p className="text-xs text-gray-400">Step 1 of 6. Progress from Premise $\rightarrow$ Treatment $\rightarrow$ Spoken Beats.</p>
                  </div>
                  <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800 text-xs">
                    {(["idea", "story", "script"] as const).map((tier) => (
                      <button
                        key={tier}
                        onClick={() => setScriptSubTier(tier)}
                        className={`px-3 py-1 rounded capitalize font-medium transition ${
                          scriptSubTier === tier
                            ? "bg-blue-600 text-white shadow"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {tier === "idea" ? "1. Idea" : tier === "story" ? "2. Story Treatment" : "3. Script Beats"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* PROMINENT ANIMATED LOADING BANNER WHEN RUNNING GENERATIONS */}
                {(isGeneratingStory || isGeneratingScript || isSavingIdea) && (
                  <div className="p-4 border border-blue-700/80 bg-blue-950/40 rounded-xl flex items-center gap-3 text-xs text-blue-200 animate-pulse shadow-lg shadow-blue-900/30">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">
                        {isGeneratingStory && "Synthesizing Story Treatment with DeepSeek AI..."}
                        {isGeneratingScript && "Generating Scene-by-Scene Narration Beats & Visual Prompts..."}
                        {isSavingIdea && "Saving Idea Draft to Disk..."}
                      </div>
                      <div className="text-[11px] text-blue-300/80">
                        Analyzing premise, setting up dramatic arc, and formatting scene boundaries.
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-TIER 1: IDEA */}
                {scriptSubTier === "idea" && (
                  <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Premise & Raw Idea</h3>
                      <div className="flex items-center gap-2">
                        {artifacts.versions?.idea?.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <span>Step Version:</span>
                            <select
                              value={artifacts.state?.active_versions?.idea || artifacts.idea?.version || "v1"}
                              onChange={(e) => handleVersionSwitch("idea", e.target.value)}
                              className="bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-gray-300 font-mono"
                            >
                              {artifacts.versions.idea.map((v: string) => (
                                <option key={v} value={v}>Version {v}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Presets:</span>
                          <button
                            onClick={() => {
                              setIdeaForm({
                                premise: "A tired merchant's hats are stolen by monkeys in a banyan tree, and he outsmarts them through mimicry.",
                                source: "Classic Indian Panchatantra moral fable.",
                                tone: "playful, witty, cinematic fable",
                                pattern: "fable",
                                audience: "Kids and families",
                                target_seconds: 60,
                                scene_count: 5,
                              });
                            }}
                            className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-[11px] text-gray-300 font-medium flex items-center gap-1"
                          >
                            <span>🎩 Fable</span>
                          </button>
                          <button
                            onClick={() => {
                              setIdeaForm({
                                premise: "Why do borders on this desert map look like straight lines? An investigation into the secret treaties that quietly divided nations.",
                                source: "Investigative documentary and archival mapping.",
                                tone: "analytical, urgent, serious yet conversational",
                                pattern: "johnny_harris",
                                audience: "Curious global thinkers and documentary viewers",
                                target_seconds: 60,
                                scene_count: 6,
                              });
                            }}
                            className="px-2 py-0.5 rounded bg-blue-950/60 hover:bg-blue-900/60 text-[11px] text-blue-300 border border-blue-800/80 font-medium flex items-center gap-1"
                          >
                            <span>🗺️ Johnny Harris</span>
                          </button>
                          <button
                            onClick={() => {
                              setIdeaForm({
                                premise: "Most people think electricity flows inside copper wires like water. But fundamental physics proves energy actually flows outside the wire.",
                                source: "Counter-intuitive physics demonstration and thought experiment.",
                                tone: "intellectually curious, contemplative, cinematic",
                                pattern: "veritasium",
                                audience: "Science enthusiasts, students, and curious minds",
                                target_seconds: 60,
                                scene_count: 5,
                              });
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900/60 text-[11px] text-emerald-300 border border-emerald-800/80 font-medium flex items-center gap-1"
                          >
                            <span>🔬 Veritasium</span>
                          </button>
                          <button
                            onClick={() => {
                              setIdeaForm({
                                premise: "Can someone cook a gourmet dinner for under three dollars in under sixty seconds with zero margin for error?",
                                source: "Viral high-speed budget challenge.",
                                tone: "high energy, enthusiastic, punchy, hyper-retention",
                                pattern: "jenny_hoyos",
                                audience: "Social media shorts viewers, Gen-Z",
                                target_seconds: 40,
                                scene_count: 6,
                              });
                            }}
                            className="px-2 py-0.5 rounded bg-orange-950/60 hover:bg-orange-900/60 text-[11px] text-orange-300 border border-orange-800/80 font-medium flex items-center gap-1"
                          >
                            <span>⚡ Jenny Hoyos</span>
                          </button>
                          <button
                            onClick={() => {
                              setIdeaForm({
                                premise: "What actually happens inside your inner ear when an unexpected soundwave triggers a microscopic chain reaction?",
                                source: "Photorealistic 3D anatomical explainer.",
                                tone: "clinical, hypnotic, morbid curiosity, crisp articulation",
                                pattern: "zack_d_films",
                                audience: "Curious explainer viewers",
                                target_seconds: 35,
                                scene_count: 5,
                              });
                            }}
                            className="px-2 py-0.5 rounded bg-red-950/60 hover:bg-red-900/60 text-[11px] text-red-300 border border-red-800/80 font-medium flex items-center gap-1"
                          >
                            <span>🧬 Zack D. Films</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-gray-400 mb-1 font-medium">Premise (What this video is about)</label>
                        <textarea
                          rows={3}
                          value={ideaForm.premise}
                          onChange={(e) => setIdeaForm({ ...ideaForm, premise: e.target.value })}
                          className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-white focus:border-blue-500 focus:outline-none"
                          placeholder="e.g. A hat seller whose hat was taken by monkeys..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-gray-400 mb-1 font-medium">Narrative Pattern / Creator Style</label>
                          <select
                            value={ideaForm.pattern}
                            onChange={(e) => setIdeaForm({ ...ideaForm, pattern: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white"
                          >
                            <option value="fable">🎩 Fable / Moral Tale</option>
                            <option value="johnny_harris">🗺️ Johnny Harris (Documentary)</option>
                            <option value="veritasium">🔬 Veritasium (Science Inquiry)</option>
                            <option value="jenny_hoyos">⚡ Jenny Hoyos (Viral Short)</option>
                            <option value="zack_d_films">🧬 Zack D. Films (3D Explainer)</option>
                            <option value="narrative">Dramatic Narrative</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-400 mb-1 font-medium">Tone</label>
                          <input
                            type="text"
                            value={ideaForm.tone}
                            onChange={(e) => setIdeaForm({ ...ideaForm, tone: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-gray-400 font-medium">Target Duration</label>
                            <span className="font-mono text-blue-400 font-bold">{ideaForm.target_seconds}s</span>
                          </div>
                          <input
                            type="range"
                            min="25"
                            max="120"
                            step="5"
                            value={ideaForm.target_seconds}
                            onChange={(e) => setIdeaForm({ ...ideaForm, target_seconds: Number(e.target.value) })}
                            className="w-full mt-2 accent-blue-500"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-gray-400 font-medium">Scene Count</label>
                            <span className="font-mono text-emerald-400 font-bold">{ideaForm.scene_count || 5} scenes</span>
                          </div>
                          <input
                            type="range"
                            min="3"
                            max="10"
                            step="1"
                            value={ideaForm.scene_count || 5}
                            onChange={(e) => setIdeaForm({ ...ideaForm, scene_count: Number(e.target.value) })}
                            className="w-full mt-2 accent-emerald-500"
                          />
                        </div>
                      </div>
                    </div>


                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                      <button
                        onClick={handleSaveIdea}
                        disabled={isSavingIdea || isGeneratingStory}
                        className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 flex items-center gap-1.5"
                      >
                        {isSavingIdea && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Save Idea Draft</span>
                      </button>
                      <button
                        onClick={handleGenerateStory}
                        disabled={isGeneratingStory}
                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-blue-600/30"
                      >
                        {isGeneratingStory ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Generating Story...</span>
                          </>
                        ) : (
                          <>
                            <span>Generate Story Treatment</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* SUB-TIER 2: STORY TREATMENT */}
                {scriptSubTier === "story" && (
                  <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Story Treatment (Arc & Setup)</h3>
                      {artifacts.versions?.story?.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <span>Step Version:</span>
                          <select
                            value={artifacts.state?.active_versions?.story || artifacts.story?.version || "v1"}
                            onChange={(e) => handleVersionSwitch("story", e.target.value)}
                            className="bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-gray-300 font-mono"
                          >
                            {artifacts.versions.story.map((v: string) => (
                              <option key={v} value={v}>Version {v}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="block text-gray-400 mb-1">Title</label>
                        <input
                          type="text"
                          value={storyForm.title || ""}
                          onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                          className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white font-bold text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-1">Logline</label>
                        <input
                          type="text"
                          value={storyForm.logline || ""}
                          onChange={(e) => setStoryForm({ ...storyForm, logline: e.target.value })}
                          className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-1">Opening Hook</label>
                        <input
                          type="text"
                          value={storyForm.hook || ""}
                          onChange={(e) => setStoryForm({ ...storyForm, hook: e.target.value })}
                          className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white text-emerald-300"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-gray-400 font-medium">Narrative Scene Arc ({storyForm.arc?.length || 0} scenes)</label>
                          <button
                            onClick={() => {
                              const newArc = [...(storyForm.arc || []), `Scene ${(storyForm.arc?.length || 0) + 1}: Dramatic turning point`];
                              setStoryForm({ ...storyForm, arc: newArc });
                            }}
                            className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-[11px] text-blue-400 font-medium flex items-center gap-1 transition"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Scene to Arc</span>
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {(storyForm.arc || []).map((scene: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="w-6 text-center font-mono text-[11px] text-gray-500">#{idx + 1}</span>
                              <input
                                type="text"
                                value={scene}
                                onChange={(e) => {
                                  const newArc = [...storyForm.arc];
                                  newArc[idx] = e.target.value;
                                  setStoryForm({ ...storyForm, arc: newArc });
                                }}
                                className="flex-1 bg-gray-900 border border-gray-800 rounded-lg p-2 text-white text-xs focus:border-blue-500 focus:outline-none"
                              />
                              <button
                                onClick={() => {
                                  const newArc = storyForm.arc.filter((_: any, i: number) => i !== idx);
                                  setStoryForm({ ...storyForm, arc: newArc });
                                }}
                                title="Delete Scene"
                                className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-gray-800 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-gray-400 mb-1">Setting</label>
                          <input
                            type="text"
                            value={storyForm.setting || ""}
                            onChange={(e) => setStoryForm({ ...storyForm, setting: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 mb-1">Climactic Payoff</label>
                          <input
                            type="text"
                            value={storyForm.payoff || ""}
                            onChange={(e) => setStoryForm({ ...storyForm, payoff: e.target.value })}
                            className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-gray-800">
                      <button
                        onClick={handleSaveStoryEdits}
                        disabled={isSavingStory}
                        className="px-3.5 py-2 rounded bg-emerald-950/80 border border-emerald-700/80 text-xs text-emerald-300 font-bold hover:bg-emerald-900 flex items-center gap-1.5 transition"
                      >
                        {isSavingStory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Save Story Changes</span>
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={handleGenerateStory}
                          disabled={isGeneratingStory}
                          className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 font-medium flex items-center gap-1.5"
                        >
                          {isGeneratingStory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          <span>Regenerate Story</span>
                        </button>
                        <button
                          onClick={handleGenerateScript}
                          disabled={isGeneratingScript}
                          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-blue-600/30"
                        >
                          {isGeneratingScript ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Generating Script Beats...</span>
                            </>
                          ) : (
                            <>
                              <span>Generate Script & Beats</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-TIER 3: SCRIPT BEATS */}
                {scriptSubTier === "script" && (
                  <div className="space-y-3">
                    <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Spoken Narration Beats</span>
                        {artifacts.script?.total_words && (
                          <span className="text-xs font-mono text-emerald-400">
                            {artifacts.script.total_words} words · ~{artifacts.script.estimated_duration_s}s
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {artifacts.script?.beats && (
                          <button
                            onClick={handleSaveScriptEdits}
                            disabled={isSavingScript}
                            className="px-3 py-1.5 rounded bg-emerald-950/80 border border-emerald-700/80 text-xs font-bold text-emerald-300 hover:bg-emerald-900 flex items-center gap-1 transition"
                          >
                            {isSavingScript ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            <span>Save Script Edits</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const newBeatIdx = (artifacts.script?.beats?.length || 0) + 1;
                            const updatedBeats = [
                              ...(artifacts.script?.beats || []),
                              {
                                index: newBeatIdx,
                                purpose: "Climax / Narrative Progression",
                                vo: "And so the plan unfolded, exactly as intended.",
                                visual_note: "Cinematic close-up of characters reacting with vivid expressions.",
                                word_count: 8,
                                estimated_duration_s: 4.0,
                              },
                            ];
                            const updatedScript = {
                              ...(artifacts.script || {}),
                              beats: updatedBeats,
                              total_words: updatedBeats.reduce((acc, b) => acc + (b.vo?.split(" ").length || 0), 0),
                            };
                            setArtifacts({ ...artifacts, script: updatedScript });
                          }}
                          className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-xs text-blue-400 font-medium flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Beat</span>
                        </button>
                        <button
                          onClick={handleGenerateScript}
                          disabled={isGeneratingScript}
                          className="px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 flex items-center gap-1.5"
                        >
                          {isGeneratingScript ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          <span>Regenerate Beats</span>
                        </button>
                        <button
                          onClick={() => setActiveRoom(2)}
                          className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1 shadow-lg shadow-blue-600/30"
                        >
                          <span>Proceed to Audio</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {artifacts.script?.beats ? (
                      <div className="space-y-3">
                        {artifacts.script.beats.map((b: any, bIdx: number) => (
                          <div key={b.index || bIdx} className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-2.5 hover:border-gray-700 transition">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded bg-blue-900/60 text-blue-300 font-mono text-xs flex items-center justify-center font-bold">
                                  #{b.index || bIdx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={b.purpose || ""}
                                  onChange={(e) => {
                                    const newBeats = [...artifacts.script.beats];
                                    newBeats[bIdx] = { ...newBeats[bIdx], purpose: e.target.value };
                                    setArtifacts({ ...artifacts, script: { ...artifacts.script, beats: newBeats } });
                                  }}
                                  className="bg-gray-900 border border-gray-800 rounded px-2 py-0.5 text-xs font-bold text-white focus:border-blue-500 focus:outline-none"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                {bIdx > 0 && (
                                  <button
                                    onClick={() => {
                                      const newBeats = [...artifacts.script.beats];
                                      const temp = newBeats[bIdx - 1];
                                      newBeats[bIdx - 1] = newBeats[bIdx];
                                      newBeats[bIdx] = temp;
                                      newBeats.forEach((item, i) => (item.index = i + 1));
                                      setArtifacts({ ...artifacts, script: { ...artifacts.script, beats: newBeats } });
                                    }}
                                    title="Move Up"
                                    className="p-1 rounded text-gray-500 hover:text-white hover:bg-gray-800 text-xs"
                                  >
                                    ▲
                                  </button>
                                )}
                                {bIdx < artifacts.script.beats.length - 1 && (
                                  <button
                                    onClick={() => {
                                      const newBeats = [...artifacts.script.beats];
                                      const temp = newBeats[bIdx + 1];
                                      newBeats[bIdx + 1] = newBeats[bIdx];
                                      newBeats[bIdx] = temp;
                                      newBeats.forEach((item, i) => (item.index = i + 1));
                                      setArtifacts({ ...artifacts, script: { ...artifacts.script, beats: newBeats } });
                                    }}
                                    title="Move Down"
                                    className="p-1 rounded text-gray-500 hover:text-white hover:bg-gray-800 text-xs"
                                  >
                                    ▼
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    const newBeats = artifacts.script.beats.filter((_: any, i: number) => i !== bIdx);
                                    newBeats.forEach((item: any, i: number) => (item.index = i + 1));
                                    setArtifacts({ ...artifacts, script: { ...artifacts.script, beats: newBeats } });
                                  }}
                                  title="Delete Beat"
                                  className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-gray-800 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Spoken Narration Voiceover</label>
                              <textarea
                                rows={2}
                                value={b.vo || b.text || ""}
                                onChange={(e) => {
                                  const newBeats = [...artifacts.script.beats];
                                  newBeats[bIdx] = { ...newBeats[bIdx], vo: e.target.value, text: e.target.value };
                                  setArtifacts({ ...artifacts, script: { ...artifacts.script, beats: newBeats } });
                                }}
                                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs text-white leading-relaxed focus:border-blue-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Visual Diffusion Prompt</label>
                              <textarea
                                rows={2}
                                value={b.visual_note || ""}
                                onChange={(e) => {
                                  const newBeats = [...artifacts.script.beats];
                                  newBeats[bIdx] = { ...newBeats[bIdx], visual_note: e.target.value };
                                  setArtifacts({ ...artifacts, script: { ...artifacts.script, beats: newBeats } });
                                }}
                                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs text-gray-300 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 border border-dashed border-gray-800 rounded-xl text-center text-xs text-gray-500 space-y-2">
                        <div>No script beats generated yet.</div>
                        <button
                          onClick={handleGenerateScript}
                          disabled={isGeneratingScript}
                          className="px-4 py-2 rounded bg-blue-600 text-white font-bold"
                        >
                          Generate Script Beats Now
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ROOM 2: VOICE & AUDIO */}
            {activeRoom === 2 && (
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-blue-400" />
                        <span>Room 2 · Audio Narration & Faster-Whisper Alignment</span>
                      </h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Synthesizes studio voiceover with Edge-TTS / Supertonic and extracts word-level phoneme boundaries.
                      </p>
                    </div>
                    <button
                      onClick={handleBuildVoice}
                      disabled={isSynthesizingVoice}
                      className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-blue-600/30 transition"
                    >
                      {isSynthesizingVoice ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Synthesizing Voice...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Synthesize Voiceover</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Voice & BGM Mixing Controls Row */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 pt-2 border-t border-gray-800/80 text-xs">
                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">Narrator Voice</label>
                      <select
                        value={selectedVoice}
                        onChange={(e) => setSelectedVoice(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white font-medium"
                      >
                        <option value="en-US-ChristopherNeural">Christopher (Veritasium / Fable)</option>
                        <option value="en-US-GuyNeural">Guy (Johnny Harris / Docu)</option>
                        <option value="en-US-JennyNeural">Jenny (Jenny Hoyos / Viral)</option>
                        <option value="en-US-BrianNeural">Brian (Zack D. Films / Deep)</option>
                        <option value="en-US-AriaNeural">Aria (Warm Clear Female)</option>
                        <option value="en-US-AndrewNeural">Andrew (Conversational Male)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">Pacing / Speed</label>
                      <select
                        value={selectedSpeed}
                        onChange={(e) => setSelectedSpeed(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white font-medium"
                      >
                        <option value={0.95}>0.95x (Slow & Contemplative)</option>
                        <option value={1.0}>1.00x (Natural Pacing)</option>
                        <option value={1.05}>1.05x (Engaging Storyteller)</option>
                        <option value={1.12}>1.12x (Urgent Documentary)</option>
                        <option value={1.2}>1.20x (Rapid Short-Form)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">Pitch Modulation</label>
                      <select
                        value={selectedPitch}
                        onChange={(e) => setSelectedPitch(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white font-medium"
                      >
                        <option value={-2}>-2Hz (Deeper Resonance)</option>
                        <option value={-1}>-1Hz (Authoritative)</option>
                        <option value={0}>0Hz (Natural Neutral)</option>
                        <option value={1}>+1Hz (Bright & Upbeat)</option>
                        <option value={2}>+2Hz (High Energy)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">BGM Ambience / Mood</label>
                      <select
                        value={selectedBgm}
                        onChange={(e) => setSelectedBgm(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white font-medium text-emerald-300"
                      >
                        <option value="none">None (Raw Voice Only)</option>
                        <option value="cinematic">Cinematic Fable (Acoustic)</option>
                        <option value="investigative">Investigative (Subtle Pulse)</option>
                        <option value="scientific">Scientific (Ambient Tone)</option>
                        <option value="viral">Viral Short (High Energy)</option>
                        <option value="tension">Dramatic Tension (Drone)</option>
                      </select>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-gray-400 font-medium">BGM Volume</label>
                        <span className="font-mono text-emerald-400 font-bold">{Math.round(selectedBgmVolume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="0.4"
                        step="0.05"
                        value={selectedBgmVolume}
                        onChange={(e) => setSelectedBgmVolume(Number(e.target.value))}
                        className="w-full mt-2 accent-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* PROMINENT ANIMATED BANNER WHEN SYNTHESIZING VOICE */}
                {isSynthesizingVoice && (
                  <div className="p-4 border border-blue-700/80 bg-blue-950/40 rounded-xl flex items-center gap-3 text-xs text-blue-200 animate-pulse shadow-lg shadow-blue-900/30">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400 shrink-0" />
                    <div>
                      <div className="font-bold text-white">Synthesizing Neural Speech & Aligning Phonemes...</div>
                      <div className="text-[11px] text-blue-300/80">
                        Generating edge voice stream, parsing audio frames, and transcribing word-level boundaries with Faster-Whisper.
                      </div>
                    </div>
                  </div>
                )}

                {/* AUDIO PLAYER & ALIGNMENT RESULTS */}
                {artifacts.timings?.words ? (
                  <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 space-y-4">
                    {/* Audio Player Card */}
                    <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-xs font-bold text-white">Voiceover Master Track</span>
                          <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                            {artifacts.timings.duration}s
                          </span>
                          <span className="text-xs font-mono text-blue-300 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                            {artifacts.timings.words.length} words
                          </span>
                        </div>
                        {activeProject && (
                          <a
                            href={api.getAudioUrl(activeProject.id, true, selectedTakeId || undefined)}
                            download="voiceover_master.mp3"
                            className="text-xs font-medium text-blue-400 hover:text-white flex items-center gap-1 hover:underline"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Audio</span>
                          </a>
                        )}
                      </div>

                      {/* Audio Takes History Switcher */}
                      {audioTakes && audioTakes.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-gray-950 border border-gray-800 text-xs">
                          <div className="flex items-center gap-2">
                            <History className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="font-semibold text-gray-300">Take Version:</span>
                            <select
                              value={selectedTakeId}
                              onChange={(e) => handleSwitchAudioTake(e.target.value)}
                              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
                            >
                              {audioTakes.map((take: any) => (
                                <option key={take.take_id} value={take.take_id}>
                                  {take.take_id} · {take.duration}s · {take.bgm_mood} BGM ({new Date(take.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRestoreAudioTake(selectedTakeId)}
                              className="px-2.5 py-1 rounded bg-blue-600/80 hover:bg-blue-600 text-[11px] font-bold text-white transition flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>Restore Active</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* HTML5 Native Audio Player */}
                      {activeProject && (
                        <audio
                          key={`${selectedTakeId}_${audioTimestamp}`}
                          ref={audioRef}
                          controls
                          className="w-full h-10 rounded-lg accent-blue-500 bg-gray-950"
                          src={`${api.getAudioUrl(activeProject.id, false, selectedTakeId || undefined)}?v=${audioTimestamp}`}
                          onTimeUpdate={(e) => setAudioCurrentTime(e.currentTarget.currentTime)}
                          onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
                        />
                      )}
                    </div>

                    {/* Word-by-Word Interactive Alignment Timeline */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                          Word-Level Phoneme Timeline (Click word to seek audio)
                        </span>
                        <span className="text-gray-500 font-mono text-[11px]">
                          Playback: {audioCurrentTime.toFixed(2)}s / {(audioDuration || artifacts.timings.duration || 0).toFixed(2)}s
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-3 bg-gray-900/90 rounded-xl border border-gray-800 text-xs select-text">
                        {artifacts.timings.words.map((w: any, idx: number) => {
                          const isActive = audioCurrentTime >= w.start && audioCurrentTime <= w.end;
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                if (audioRef.current) {
                                  audioRef.current.currentTime = w.start;
                                  audioRef.current.play();
                                }
                              }}
                              className={`px-2 py-1 rounded-md text-xs font-mono transition transform ${
                                isActive
                                  ? "bg-blue-600 text-white font-bold scale-105 shadow-md shadow-blue-500/50"
                                  : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                              }`}
                            >
                              <span>{w.word}</span>
                              <span className="text-[9px] opacity-70 ml-1">({w.start}s)</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Proceed Button */}
                    <div className="flex justify-end pt-2 border-t border-gray-800">
                      <button
                        onClick={() => {
                          setActiveRoom(3);
                          handleBuildCut();
                        }}
                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition"
                      >
                        <span>Proceed to Room 3: The Cut</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 border border-dashed border-gray-800 rounded-xl bg-gray-950 text-center space-y-3">
                    <Volume2 className="w-8 h-8 text-gray-600 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Voiceover Not Synthesized Yet</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                        Click "Synthesize Voiceover" above to generate studio neural speech from your script beats with sub-second word alignment.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ROOM 3: THE CUT */}
            {activeRoom === 3 && (
              <div className="max-w-5xl mx-auto space-y-4">
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-blue-400" />
                        <span>Room 3 · The Cut (Audio to Shot Boundaries)</span>
                      </h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Determines where visual cuts occur based on narration pace and energy cadence. Split, merge, or adjust camera trajectory per shot.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {artifacts.shots?.shots && (
                        <button
                          onClick={handleSaveCutEdits}
                          disabled={isSavingCut}
                          className="px-3 py-1.5 rounded bg-emerald-950/80 border border-emerald-700/80 text-xs font-bold text-emerald-300 hover:bg-emerald-900 flex items-center gap-1 transition"
                        >
                          {isSavingCut ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          <span>Save Cut Timeline</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleBuildCut()}
                        disabled={isComputingCut}
                        className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition"
                      >
                        {isComputingCut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        <span>Recompute Cadence</span>
                      </button>
                    </div>
                  </div>

                  {/* Energy Cadence Selector */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-800 text-xs">
                    <span className="text-gray-400 font-medium">Energy Cadence:</span>
                    {[
                      { id: "calm", label: "Calm (4.5s cuts)" },
                      { id: "normal", label: "Normal (3.2s cuts)" },
                      { id: "high", label: "High (2.2s cuts)" },
                      { id: "frantic", label: "Frantic (1.5s cuts)" },
                    ].map((e) => (
                      <button
                        key={e.id}
                        onClick={() => handleBuildCut(e.id)}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                          (artifacts.shots?.energy || "normal") === e.id
                            ? "bg-blue-600 text-white shadow font-bold"
                            : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
                        }`}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CUT TIMELINE & SHOT CARDS */}
                {artifacts.shots?.shots ? (
                  <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 space-y-4">
                    {/* Visual Timeline Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[11px] font-mono text-gray-400">
                        <span>Timeline ({artifacts.shots.duration}s total)</span>
                        <span className="text-blue-400 font-bold">{artifacts.shots.shots.length} shots</span>
                      </div>
                      <div className="flex h-12 w-full rounded-xl border border-gray-800 bg-gray-900 overflow-hidden p-0.5 gap-0.5">
                        {artifacts.shots.shots.map((s: any) => {
                          const pct = (s.duration / artifacts.shots.duration) * 100;
                          return (
                            <div
                              key={s.index}
                              style={{ width: `${pct}%` }}
                              title={`Shot #${s.index} (${s.start}s - ${s.end}s): ${s.text}`}
                              className="h-full rounded bg-blue-600/30 hover:bg-blue-600/50 p-1 flex flex-col justify-between truncate border border-blue-500/20 transition cursor-pointer"
                            >
                              <span className="text-[10px] font-mono font-bold text-blue-300">#{s.index}</span>
                              <span className="text-[9px] text-gray-300 font-mono truncate">{s.duration}s</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Detailed Interactive Shot Breakdown List */}
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {artifacts.shots.shots.map((s: any, sIdx: number) => (
                        <div
                          key={s.index}
                          className="bg-gray-900 border border-gray-800 rounded-xl p-3.5 space-y-2.5 text-xs hover:border-gray-700 transition"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded bg-blue-900/60 text-blue-300 font-mono text-xs flex items-center justify-center font-bold">
                                #{s.index}
                              </span>
                              <span className="font-mono text-emerald-400 text-xs font-semibold">
                                {s.start.toFixed(2)}s – {s.end.toFixed(2)}s ({s.duration.toFixed(2)}s)
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleSplitShot(s.index)}
                                title="Split shot into two cuts"
                                className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-blue-400 font-medium text-[11px] flex items-center gap-1"
                              >
                                <Scissors className="w-3 h-3" />
                                <span>Split</span>
                              </button>
                              {sIdx < artifacts.shots.shots.length - 1 && (
                                <button
                                  onClick={() => handleMergeShot(s.index)}
                                  title="Merge with next shot"
                                  className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-purple-400 font-medium text-[11px] flex items-center gap-1"
                                >
                                  <span>Merge Next</span>
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  const newShots = artifacts.shots.shots.filter((_: any, i: number) => i !== sIdx);
                                  newShots.forEach((item: any, i: number) => (item.index = i + 1));
                                  setArtifacts({ ...artifacts, shots: { ...artifacts.shots, shots: newShots, shot_count: newShots.length } });
                                }}
                                title="Delete Shot"
                                className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-gray-800 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-gray-200 text-xs font-sans italic bg-gray-950/60 p-2 rounded border border-gray-800/80">
                            "{s.text}"
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Camera Trajectory</label>
                              <select
                                value={s.camera_trajectory || "push_in"}
                                onChange={(e) => {
                                  const newShots = [...artifacts.shots.shots];
                                  newShots[sIdx] = { ...newShots[sIdx], camera_trajectory: e.target.value };
                                  setArtifacts({ ...artifacts, shots: { ...artifacts.shots, shots: newShots } });
                                }}
                                className="w-full bg-gray-950 border border-gray-800 rounded p-1.5 text-xs text-white capitalize"
                              >
                                <option value="push_in">Push In (Slow Dolly)</option>
                                <option value="pull_out">Pull Out (Reveal)</option>
                                <option value="pan_left">Pan Left-to-Right</option>
                                <option value="pan_right">Pan Right-to-Left</option>
                                <option value="orbit">Dynamic Orbit</option>
                                <option value="static_hold">Static Hold</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-400 uppercase font-semibold mb-1">Visual Prompt Direction</label>
                              <input
                                type="text"
                                value={s.visual_note || ""}
                                onChange={(e) => {
                                  const newShots = [...artifacts.shots.shots];
                                  newShots[sIdx] = { ...newShots[sIdx], visual_note: e.target.value };
                                  setArtifacts({ ...artifacts, shots: { ...artifacts.shots, shots: newShots } });
                                }}
                                className="w-full bg-gray-950 border border-gray-800 rounded p-1.5 text-xs text-gray-300 focus:border-blue-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Proceed Button */}
                    <div className="flex justify-end pt-2 border-t border-gray-800">
                      <button
                        onClick={() => {
                          setActiveRoom(4);
                          handleBuildImages();
                        }}
                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition"
                      >
                        <span>Proceed to Room 4: Shot Images</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 border border-dashed border-gray-800 rounded-xl bg-gray-950 text-center space-y-3">
                    <Scissors className="w-8 h-8 text-gray-600 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Cuts Not Computed Yet</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                        Click "Compute Cuts" above to partition the synthesized audio track into shot boundaries.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ROOM 4: SHOT IMAGES */}
            {activeRoom === 4 && (
              <div className="max-w-5xl mx-auto space-y-4">
                {/* Hidden file input for custom image uploads */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelected}
                  className="hidden"
                  accept="image/png,image/jpeg,image/webp"
                />

                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Film className="w-4 h-4 text-blue-400" />
                        <span>Room 4 · Shot Visuals Generation</span>
                      </h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Choose between zero-setup Local OpenVINO generation or lightning-fast Hosted Colab GPU generation.
                      </p>
                    </div>

                    {/* DUAL ENGINE SELECTOR */}
                    <div className="flex items-center gap-2">
                      <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800">
                        <button
                          type="button"
                          onClick={() => setImageEngine("local")}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                            imageEngine === "local"
                              ? "bg-blue-600 text-white font-bold shadow"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          <Monitor className="w-3.5 h-3.5" />
                          <span>Local: Animagine XL</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageEngine("colab")}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                            imageEngine === "colab"
                              ? "bg-amber-600 text-white font-bold shadow"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-200" />
                          <span>Hosted Colab: Z-Image-Turbo</span>
                        </button>
                      </div>

                      <button
                        onClick={handleAutoDirectVisuals}
                        disabled={isDirectingVisuals || !activeProject}
                        title="Analyze full story and cuts to synthesize distinct visual scene prompts and camera motion tags"
                        className="px-3.5 py-2 rounded text-xs font-bold text-amber-200 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/60 flex items-center gap-1.5 shadow-lg transition disabled:opacity-50"
                      >
                        {isDirectingVisuals ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                            <span>Directing Scene Visuals...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>✨ Auto-Direct Visuals</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleBuildImages}
                        disabled={isGeneratingImages}
                        className={`px-4 py-2 rounded text-xs font-bold text-white flex items-center gap-1.5 shadow-lg transition ${
                          imageEngine === "colab"
                            ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/30"
                            : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/30"
                        } disabled:opacity-50`}
                      >
                        {isGeneratingImages ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Generating Shots...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Generate All ({imageEngine === "colab" ? "Colab GPU" : "Local"})</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* ACTIVE ENGINE DETAIL BANNER */}
                  {imageEngine === "colab" ? (
                    <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${colabStatus.online ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                        <span className="font-semibold text-amber-200">
                          {colabStatus.online ? (
                            <>Colab GPU Connected: {colabStatus.gpu_name || "A100 / T4"} {colabStatus.latency_ms ? `(${colabStatus.latency_ms}ms)` : ""}</>
                          ) : (
                            "Colab Server Offline or Connecting..."
                          )}
                        </span>
                        <span className="text-[11px] text-amber-400/70 border-l border-amber-800/60 pl-2 font-mono">
                          stabilityai/sdxl-turbo · 1-step ultra-fast (~2.5s/img)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          type="text"
                          value={colabConfig.url}
                          onChange={(e) => {
                            const newUrl = e.target.value;
                            setColabConfig({ ...colabConfig, url: newUrl });
                            api.saveColab(newUrl, colabConfig.token);
                          }}
                          placeholder="https://xxx.trycloudflare.com"
                          className="bg-black/50 border border-amber-900/50 rounded px-2.5 py-1 text-xs text-amber-200 placeholder-amber-700/50 font-mono flex-1 sm:w-64 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={handlePingColab}
                          disabled={isTestingColab}
                          className="px-2.5 py-1 rounded bg-amber-900/40 hover:bg-amber-900/60 border border-amber-700/50 text-amber-200 text-xs flex items-center gap-1 font-medium transition"
                        >
                          {isTestingColab ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          <span>Test Ping</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            window.open("https://colab.research.google.com/github/Ankitravi1/ReelForge/blob/main/scripts/colab_wan2gp_server.ipynb", "_blank");
                          }}
                          className="px-2.5 py-1 rounded bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 text-xs flex items-center gap-1 font-medium transition"
                          title="Open Google Colab notebook"
                        >
                          <ExternalLink className="w-3 h-3 text-amber-400" />
                          <span>Launch Colab</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-950/20 border border-blue-900/40 rounded-lg p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                        <span className="font-semibold text-blue-200">Local OpenVINO Neural Engine</span>
                        <span className="text-[11px] text-blue-400/70 border-l border-blue-800/60 pl-2">
                          HelloSun/animagine-xl-4.0_Lightning_ov (Cached locally · CPU/iGPU)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-blue-300/80 font-mono">
                        <span>4-Step Low-VRAM Diffusion · Offline Ready</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* IMAGES GALLERY (1:1 CUT-TO-SHOT MATCHING) */}
                {combinedShots.length > 0 ? (
                  <div className="space-y-4">
                    <div
                      className={`grid gap-4 ${
                        activeProject?.aspect_ratio === "16:9"
                          ? "grid-cols-1 md:grid-cols-2"
                          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                      }`}
                    >
                      {combinedShots.map((shot: any) => (
                        <div
                          key={shot.index}
                          className="bg-gray-950 border border-gray-800 hover:border-gray-700 rounded-xl p-3.5 space-y-3 transition relative flex flex-col justify-between shadow-lg"
                        >
                          {/* Top Visual Preview */}
                          <div
                            onClick={() => shot.hasImage && setLightboxShotIdx(shot.index)}
                            className={`w-full bg-gray-900 rounded-lg overflow-hidden border border-gray-800 relative group select-none ${
                              shot.hasImage ? "cursor-pointer" : ""
                            } ${
                              activeProject?.aspect_ratio === "16:9" ? "aspect-video" : "aspect-[9/16]"
                            }`}
                          >
                            {shot.hasImage ? (
                              <>
                                <img
                                  src={shot.imageUrl}
                                  alt={`Shot #${shot.index}`}
                                  className="w-full h-full object-cover bg-gray-900 group-hover:scale-[1.02] transition duration-300"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 backdrop-blur-[2px]">
                                  <Eye className="w-5 h-5 text-white drop-shadow" />
                                  <span className="text-xs font-bold text-white drop-shadow">View Full Screen</span>
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gray-900/50 border border-dashed border-gray-800">
                                <Film className="w-8 h-8 text-gray-700 mb-2" />
                                <span className="text-xs font-semibold text-gray-400">Shot #{shot.index} Pending</span>
                                <span className="text-[10px] text-gray-600 mt-1">Ready to render visual</span>
                              </div>
                            )}

                            {/* Badges Overlay */}
                            <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
                              <span className="px-2 py-0.5 rounded bg-black/85 backdrop-blur font-mono text-[10px] text-blue-300 font-bold border border-blue-900/80 shadow">
                                Shot #{shot.index}
                              </span>
                              {shot.elapsed_s && (
                                <span className="px-1.5 py-0.5 rounded font-mono text-[9px] font-extrabold bg-amber-950/90 text-amber-300 border border-amber-800 shadow">
                                  ⚡ {shot.elapsed_s.toFixed(1)}s
                                </span>
                              )}
                            </div>

                            <div className="absolute top-2 right-2 flex items-center gap-1 pointer-events-none">
                              <span className="px-2 py-0.5 rounded bg-black/85 backdrop-blur font-mono text-[10px] text-emerald-400 border border-emerald-900/80 shadow">
                                {shot.duration ? `${shot.duration.toFixed(1)}s` : "3.0s"}
                              </span>
                            </div>

                            {/* Bottom Info Badges */}
                            <div className="absolute bottom-2 left-2 flex items-center gap-1 pointer-events-none">
                              {shot.engine && (
                                <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold border ${
                                  shot.engine === "colab"
                                    ? "bg-amber-950/90 text-amber-300 border-amber-800"
                                    : "bg-blue-950/90 text-blue-300 border-blue-800"
                                }`}>
                                  {shot.engine === "colab" ? "⚡ SDXL-Turbo" : "💻 Animagine"}
                                </span>
                              )}
                              {shot.camera_motion && (
                                <span className="px-1.5 py-0.5 rounded font-mono text-[9px] text-purple-300 bg-purple-950/80 border border-purple-800/70 truncate max-w-[130px]" title={shot.camera_motion}>
                                  📹 {shot.camera_motion}
                                </span>
                              )}
                            </div>

                            {shot.hasImage && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxShotIdx(shot.index);
                                }}
                                title="Open in Full Screen Viewer"
                                className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-black text-gray-300 hover:text-white border border-gray-700/60 shadow transition"
                              >
                                <Maximize2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Story & Prompt Details */}
                          <div className="space-y-2 flex-1 flex flex-col justify-between">
                            {/* Spoken Narration (Speech Script) */}
                            <div className="bg-black/40 border border-gray-800/80 rounded-lg p-2.5 space-y-0.5">
                              <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                <span>🎙️ Spoken Narration</span>
                                <span className="text-[9px] font-mono text-gray-600">Cut #{shot.index}</span>
                              </div>
                              <p className="text-[11px] text-gray-300 italic line-clamp-2 leading-relaxed" title={shot.text}>
                                "{shot.text || "No spoken audio"}"
                              </p>
                            </div>

                            {/* Editable Visual Prompt */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-blue-400 flex items-center gap-1">
                                  🎨 Visual Scene Prompt
                                </span>
                                <span className="text-[9px] text-gray-500 font-mono">Autosaved on edit</span>
                              </div>
                              <textarea
                                rows={2}
                                value={shot.visual_prompt || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (artifacts.shots?.shots) {
                                    const newShots = artifacts.shots.shots.map((s: any) =>
                                      s.index === shot.index ? { ...s, visual_prompt: val } : s
                                    );
                                    setArtifacts({ ...artifacts, shots: { ...artifacts.shots, shots: newShots } });
                                  }
                                }}
                                onBlur={(e) => handleUpdateShotPrompt(shot.index, e.target.value, shot.camera_motion)}
                                className="w-full bg-gray-900 border border-gray-800 hover:border-gray-700 focus:border-blue-500 rounded-lg p-2 text-[11px] text-gray-200 leading-snug focus:outline-none transition"
                                placeholder="Visual prompt (e.g., A weary cap merchant sleeping under a banyan tree...)"
                              />
                            </div>

                            {/* Card Footer Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-900">
                              <span className="text-[10px] text-gray-500 font-mono">
                                {activeProject?.aspect_ratio === "16:9" ? "1024x576" : "576x1024"}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleUploadImageClick(shot.index)}
                                  title="Upload custom image file for this shot"
                                  className="px-2 py-1 rounded bg-gray-900 hover:bg-gray-800 border border-gray-800 text-[10px] text-purple-400 font-medium flex items-center gap-1 transition"
                                >
                                  <Download className="w-3 h-3 rotate-180" />
                                  <span>Upload</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRerollImage(shot.index)}
                                  disabled={rerollingShotIdx === shot.index}
                                  title={`Generate or re-roll using ${imageEngine === "colab" ? "Colab SDXL-Turbo" : "Local Animagine XL"}`}
                                  className={`px-2 py-1 rounded border text-[10px] font-medium flex items-center gap-1 transition ${
                                    imageEngine === "colab"
                                      ? "bg-amber-950/40 hover:bg-amber-900/50 border-amber-800/60 text-amber-300"
                                      : "bg-gray-900 hover:bg-gray-800 border-gray-800 text-blue-400"
                                  }`}
                                >
                                  {rerollingShotIdx === shot.index ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                  <span>{shot.hasImage ? "Re-roll" : "Generate"} ({imageEngine === "colab" ? "Colab" : "Local"})</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Proceed Button */}
                    <div className="flex justify-end pt-2 border-t border-gray-800">
                      <button
                        onClick={() => {
                          setActiveRoom(5);
                          handleBuildMotion();
                        }}
                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition"
                      >
                        <span>Proceed to Room 5: Motion Engine</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 border border-dashed border-gray-800 rounded-xl bg-gray-950 text-center space-y-3">
                    <Film className="w-8 h-8 text-gray-600 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-white">No Cuts or Shots Found Yet</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                        Please generate the speech audio and timeline cuts in Room 3 first, then return here to direct and render visuals.
                      </p>
                      <button
                        onClick={() => setActiveRoom(3)}
                        className="mt-3 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition inline-flex items-center gap-1"
                      >
                        <span>Go to Room 3: Cut & Timeline</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ROOM 5: MOTION ENGINE (INTERACTIVE 2.5D PARALLAX CANVAS & TRAJECTORIES) */}
            {activeRoom === 5 && (
              <div className="max-w-5xl mx-auto space-y-4">
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-400" />
                        <span>Room 5 · 2.5D Parallax Motion Engine & Depth View</span>
                      </h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Interactive monocular depth displacement maps, real-time 3D camera parallax simulation, and trajectory keyframing.
                      </p>
                    </div>
                    <button
                      onClick={handleBuildMotion}
                      disabled={isPlanningMotion}
                      className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition"
                    >
                      {isPlanningMotion ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Estimating Depth & Motion...</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-3.5 h-3.5" />
                          <span>Plan Motion Engine</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Mode Selector & Shot Chips */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-800 text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-medium">Motion Mode:</span>
                      <button
                        onClick={() => setMotionMode("parallax_2.5d")}
                        className={`px-3 py-1 rounded font-medium transition ${
                          motionMode === "parallax_2.5d"
                            ? "bg-blue-600 text-white shadow font-bold"
                            : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
                        }`}
                      >
                        2.5D Parallax (Local Depth-Anything)
                      </button>
                      <button
                        onClick={() => setMotionMode("colab_wan2gp")}
                        className={`px-3 py-1 rounded font-medium transition ${
                          motionMode === "colab_wan2gp"
                            ? "bg-blue-600 text-white shadow font-bold"
                            : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
                        }`}
                      >
                        Wan2GP (Google Colab Video)
                      </button>
                    </div>

                    {artifacts.motion?.plan?.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 font-mono text-[11px] mr-1">Preview Shot:</span>
                        {artifacts.motion.plan.map((m: any) => (
                          <button
                            key={m.shot_index}
                            onClick={() => setActiveParallaxShot(m.shot_index)}
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                              activeParallaxShot === m.shot_index
                                ? "bg-blue-600 text-white shadow"
                                : "bg-gray-900 text-gray-400 hover:text-white"
                            }`}
                          >
                            #{m.shot_index}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* INTERACTIVE 2.5D PARALLAX VIEWPORT */}
                {artifacts.motion?.plan ? (
                  <div className="space-y-4">
                    {/* Interactive 3D Canvas Stage */}
                    <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            Interactive 2.5D Parallax Stage · Shot #{activeParallaxShot}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-900">
                            Move cursor over image to tilt 3D perspective
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              // Animate subtle orbit
                              let angle = 0;
                              const timer = setInterval(() => {
                                angle += 0.15;
                                setParallaxTilt({
                                  x: Math.sin(angle) * 12,
                                  y: Math.cos(angle) * 8,
                                });
                                if (angle >= Math.PI * 2) {
                                  clearInterval(timer);
                                  setParallaxTilt({ x: 0, y: 0 });
                                }
                              }, 30);
                            }}
                            className="px-2.5 py-1 rounded bg-gray-900 hover:bg-gray-800 border border-gray-800 text-[11px] text-blue-400 font-medium flex items-center gap-1 transition"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Play Camera Orbit</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        {/* 3D Perspective Tilt Stage */}
                        <div
                          className="md:col-span-2 bg-black rounded-xl p-4 border border-gray-800 flex items-center justify-center overflow-hidden cursor-crosshair relative"
                          onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - rect.left) / rect.width - 0.5) * 25;
                            const y = -((e.clientY - rect.top) / rect.height - 0.5) * 20;
                            setParallaxTilt({ x, y });
                          }}
                          onMouseLeave={() => setParallaxTilt({ x: 0, y: 0 })}
                        >
                          <div
                            style={{
                              transform: `perspective(800px) rotateY(${parallaxTilt.x}deg) rotateX(${parallaxTilt.y}deg) scale(1.06)`,
                              transition: "transform 0.1s ease-out",
                            }}
                            className={`rounded-lg overflow-hidden border border-blue-500/30 shadow-2xl shadow-blue-500/20 max-h-[380px] ${
                              activeProject?.aspect_ratio === "16:9" ? "aspect-video w-full" : "aspect-[9/16] h-[360px]"
                            }`}
                          >
                            {activeProject && (
                              <img
                                src={`${api.getMediaUrl(activeProject.id, "images", `shot_${String(activeParallaxShot).padStart(3, "0")}.png`)}?t=${imagesTimestamp}`}
                                alt="RGB Still"
                                className="w-full h-full object-cover select-none pointer-events-none"
                              />
                            )}
                          </div>

                          <div className="absolute bottom-3 left-4 px-2 py-1 rounded bg-black/80 backdrop-blur font-mono text-[10px] text-gray-300 border border-gray-800">
                            Tilt: X: {parallaxTilt.x.toFixed(1)}° · Y: {parallaxTilt.y.toFixed(1)}°
                          </div>
                        </div>

                        {/* Depth Map View & Keyframe Info */}
                        <div className="space-y-3">
                          <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 space-y-2">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                              Monocular Depth Map (Depth-Anything-V2)
                            </span>
                            <div
                              className={`w-full bg-black rounded-lg overflow-hidden border border-gray-800 ${
                                activeProject?.aspect_ratio === "16:9" ? "aspect-video" : "aspect-[9/16] max-h-48"
                              }`}
                            >
                              {activeProject && (
                                <img
                                  src={`${api.getMediaUrl(activeProject.id, "depths", `depth_${String(activeParallaxShot).padStart(3, "0")}.png`)}?t=${motionTimestamp}`}
                                  alt="Grayscale Depth"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              )}
                            </div>
                            <span className="text-[10px] text-gray-500 font-mono block">
                              White = Foreground (near) · Dark = Horizon (far)
                            </span>
                          </div>

                          {/* Motion Trajectory Preset for this Shot */}
                          <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 space-y-2 text-xs">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                              Trajectory Keyframes
                            </span>
                            <div>
                              <label className="block text-gray-400 text-[11px] mb-1">Camera Path</label>
                              <select
                                value={artifacts.motion.plan.find((m: any) => m.shot_index === activeParallaxShot)?.camera_trajectory || "push_in"}
                                onChange={(e) => {
                                  const updatedPlan = artifacts.motion.plan.map((m: any) =>
                                    m.shot_index === activeParallaxShot ? { ...m, camera_trajectory: e.target.value } : m
                                  );
                                  setArtifacts({ ...artifacts, motion: { ...artifacts.motion, plan: updatedPlan } });
                                }}
                                className="w-full bg-gray-950 border border-gray-800 rounded p-1.5 text-white capitalize text-xs"
                              >
                                <option value="push_in">Push In (Slow Dolly Zoom)</option>
                                <option value="pull_out">Pull Out (Reveal)</option>
                                <option value="pan_left">Pan Left-to-Right</option>
                                <option value="pan_right">Pan Right-to-Left</option>
                                <option value="orbit">Dynamic Orbit</option>
                              </select>
                            </div>
                            <div className="flex justify-between items-center text-[11px] text-gray-400 pt-1">
                              <span>Zoom Intensity:</span>
                              <span className="font-mono text-blue-400 font-bold">
                                {artifacts.motion.plan.find((m: any) => m.shot_index === activeParallaxShot)?.zoom_ratio || 1.0}x
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Proceed Button */}
                    <div className="flex justify-end pt-2 border-t border-gray-800">
                      <button
                        onClick={() => setActiveRoom(6)}
                        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition"
                      >
                        <span>Proceed to Room 6: Final Assembly & Render</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-12 border border-dashed border-gray-800 rounded-xl bg-gray-950 text-center space-y-3">
                    <Layers className="w-8 h-8 text-gray-600 mx-auto" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Motion Not Planned Yet</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                        Click "Plan Motion Engine" above to estimate Depth-Anything displacement and camera trajectories.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ROOM 6: ASSEMBLY & FINAL VIDEO PLAYER */}
            {activeRoom === 6 && (
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Video className="w-4 h-4 text-emerald-400" />
                      <span>Room 6 · Non-Destructive Video Assembly (FFmpeg Engine)</span>
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Combines camera pan/zoom motion clips, master audio track, and dynamic subtitles into a production MP4.
                    </p>
                  </div>
                  <button
                    onClick={handleRender}
                    disabled={isRenderingVideo}
                    className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition"
                  >
                    {isRenderingVideo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Rendering Video Export with FFmpeg...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Render Video Export</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Render Configuration Controls */}
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Export Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">Export Resolution</label>
                      <select
                        value={activeProject?.aspect_ratio === "16:9" ? "1920x1080" : "1080x1920"}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white font-medium"
                      >
                        <option value="1080x1920">1080 x 1920 (9:16 Vertical Short)</option>
                        <option value="1920x1080">1920 x 1080 (16:9 Landscape Video)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">Framerate</label>
                      <select className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white font-medium">
                        <option value={30}>30 FPS (Standard H.264)</option>
                        <option value={24}>24 FPS (Cinematic 24p)</option>
                        <option value={60}>60 FPS (Ultra Smooth)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-400 mb-1 font-medium">Subtitle Style</label>
                      <select className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-white font-medium">
                        <option value="cinematic_yellow">Cinematic Yellow with Glow</option>
                        <option value="clean_white">Clean White Bold</option>
                        <option value="bold_box">Bold Box High-Retention</option>
                      </select>
                    </div>
                  </div>

                  {/* REAL VIDEO PLAYER & DOWNLOAD CARD */}
                  <div className="p-5 border border-gray-800 rounded-xl bg-gray-900/60 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-white">Master Video Output</span>
                        {activeProject && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-900">
                            {activeProject.aspect_ratio || "9:16"}
                          </span>
                        )}
                      </div>
                      {activeProject && (
                        <a
                          href={`${api.getVideoUrl(activeProject.id)}&download=true`}
                          download={`${activeProject.title || "video"}.mp4`}
                          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 shadow transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download MP4</span>
                        </a>
                      )}
                    </div>

                    {/* HTML5 Video Player */}
                    <div
                      className={`mx-auto bg-black rounded-xl overflow-hidden border border-gray-800 shadow-2xl flex items-center justify-center ${
                        activeProject?.aspect_ratio === "16:9" ? "aspect-video w-full max-w-2xl" : "aspect-[9/16] h-[480px]"
                      }`}
                    >
                      {activeProject && (
                        <video
                          ref={videoRef}
                          controls
                          className="w-full h-full object-contain"
                          src={`${api.getVideoUrl(activeProject.id)}?t=${videoTimestamp}`}
                        />
                      )}
                    </div>

                    <div className="p-3 rounded-lg bg-gray-950 border border-gray-800/80 flex items-center justify-between text-xs text-gray-400 font-mono">
                      <span>Codec: H.264 High / AAC Stereo</span>
                      <span>Audio: Master Mixed Voice + Ambience</span>
                      <span className="text-emerald-400 font-bold">Status: Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* FULL-PAGE USER SETTINGS MODAL (With full 5-pillar Profile Editor & Model Download/Delete) */}
      {showFullUserSettings && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-5xl w-full h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="h-14 border-b border-gray-800 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Studio Settings & Workspace Configurator</h2>
                  <p className="text-[11px] text-gray-400">User ID: usr_admin · creator@autitic.ai</p>
                </div>
              </div>
              <button
                onClick={() => setShowFullUserSettings(false)}
                className="text-gray-400 hover:text-white text-xl font-bold p-2"
              >
                &times;
              </button>
            </div>

            {/* Modal Body with Sidebar Tabs */}
            <div className="flex-1 flex overflow-hidden">
              {/* Settings Sidebar */}
              <div className="w-56 border-r border-gray-800 p-3 space-y-1 bg-gray-950 shrink-0">
                {[
                  { id: "profiles", label: "Profile Management", icon: Sliders },
                  { id: "models", label: "Model Configurator", icon: Cpu },
                  { id: "api", label: "API Keys & Colab", icon: Key },
                  { id: "storage", label: "Data Folders & Disks", icon: Folder },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setUserSettingsTab(t.id as any)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition ${
                        userSettingsTab === t.id
                          ? "bg-blue-600 text-white shadow"
                          : "text-gray-400 hover:bg-gray-900 hover:text-gray-200"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Settings Content Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* TAB 1: PROFILES (FULL 5-PILLAR CONFIGURATION) */}
                {userSettingsTab === "profiles" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">Channel Profile Manager</h3>
                        <p className="text-xs text-gray-400">
                          Complete 5-stage configuration presets for channel "{activeChannel?.name}".
                        </p>
                      </div>
                      <button
                        onClick={handleCreateClonedProfile}
                        className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Clone Default Profile</span>
                      </button>
                    </div>

                    {/* Profile Selection Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {profiles.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setActiveProfile(p)}
                          className={`p-3 rounded-xl border cursor-pointer transition ${
                            activeProfile?.id === p.id
                              ? "border-blue-500 bg-blue-950/20 shadow-lg shadow-blue-500/10"
                              : "border-gray-800 bg-gray-900/60 hover:border-gray-700"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-white">{p.name}</span>
                            {p.is_default && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-[10px] text-gray-400 space-y-0.5">
                            <div>Persona: {p.script_config?.persona || "Storyteller"}</div>
                            <div>Voice: {p.tts_config?.voice_id || "ChristopherNeural"}</div>
                            <div>Model: {p.image_motion_config?.model || "Animagine XL"}</div>
                          </div>
                          {!p.is_default && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetDefaultProfile(p);
                              }}
                              className="mt-3 text-[10px] text-blue-400 hover:underline"
                            >
                              Set as Channel Default
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* FULL 5-PILLAR PROFILE EDITOR */}
                    {activeProfile && (
                      <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 space-y-4 text-xs">
                        <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                          <span className="font-bold text-white text-sm">
                            Editing Profile: <span className="text-blue-400">{activeProfile.name}</span>
                          </span>
                          {/* 5-Pillar Sub-Navigation */}
                          <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-lg border border-gray-800">
                            {[
                              { id: "script", label: "1. Script" },
                              { id: "tts", label: "2. Audio/TTS" },
                              { id: "image", label: "3. Image" },
                              { id: "motion", label: "4. Motion" },
                              { id: "render", label: "5. Render" },
                            ].map((tb) => (
                              <button
                                key={tb.id}
                                onClick={() => setProfileEditorTab(tb.id as any)}
                                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                                  profileEditorTab === tb.id
                                    ? "bg-blue-600 text-white font-bold"
                                    : "text-gray-400 hover:text-white"
                                }`}
                              >
                                {tb.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Pillar 1: Script */}
                        {profileEditorTab === "script" && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-gray-400 mb-1">Profile Name</label>
                                <input
                                  type="text"
                                  value={activeProfile.name}
                                  onChange={(e) => setActiveProfile({ ...activeProfile, name: e.target.value })}
                                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-400 mb-1">Writer Persona</label>
                                <input
                                  type="text"
                                  value={activeProfile.script_config?.persona || ""}
                                  onChange={(e) =>
                                    setActiveProfile({
                                      ...activeProfile,
                                      script_config: { ...activeProfile.script_config, persona: e.target.value },
                                    })
                                  }
                                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-400 mb-1">Tone & Voice</label>
                                <input
                                  type="text"
                                  value={activeProfile.script_config?.tone || ""}
                                  onChange={(e) =>
                                    setActiveProfile({
                                      ...activeProfile,
                                      script_config: { ...activeProfile.script_config, tone: e.target.value },
                                    })
                                  }
                                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-400 mb-1">Target Audience</label>
                                <input
                                  type="text"
                                  value={activeProfile.script_config?.target_audience || ""}
                                  onChange={(e) =>
                                    setActiveProfile({
                                      ...activeProfile,
                                      script_config: { ...activeProfile.script_config, target_audience: e.target.value },
                                    })
                                  }
                                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-400 mb-1">Default Duration (Seconds)</label>
                                <input
                                  type="number"
                                  value={activeProfile.script_config?.target_duration_s || 60}
                                  onChange={(e) =>
                                    setActiveProfile({
                                      ...activeProfile,
                                      script_config: { ...activeProfile.script_config, target_duration_s: Number(e.target.value) },
                                    })
                                  }
                                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-400 mb-1">Default Scene Count</label>
                                <input
                                  type="number"
                                  value={activeProfile.script_config?.beat_target || 5}
                                  onChange={(e) =>
                                    setActiveProfile({
                                      ...activeProfile,
                                      script_config: { ...activeProfile.script_config, beat_target: Number(e.target.value) },
                                    })
                                  }
                                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Pillar 2: Audio & TTS */}
                        {profileEditorTab === "tts" && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-gray-400 mb-1">Voice ID (Supertonic / Edge-TTS)</label>
                                <select
                                  value={activeProfile.tts_config?.voice_id || "en-US-ChristopherNeural"}
                                  onChange={(e) =>
                                    setActiveProfile({
                                      ...activeProfile,
                                      tts_config: { ...activeProfile.tts_config, voice_id: e.target.value },
                                    })
                                  }
                                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white font-mono"
                                >
                                  <option value="en-US-ChristopherNeural">en-US-ChristopherNeural (Male Narrative)</option>
                                  <option value="en-US-GuyNeural">en-US-GuyNeural (Casual Male)</option>
                                  <option value="en-US-JennyNeural">en-US-JennyNeural (Expressive Female)</option>
                                  <option value="en-US-AriaNeural">en-US-AriaNeural (Warm Female)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-gray-400 mb-1">Speed Rate ({activeProfile.tts_config?.speed || 1.0}x)</label>
                                <input
                                  type="range"
                                  min="0.8"
                                  max="1.5"
                                  step="0.05"
                                  value={activeProfile.tts_config?.speed || 1.0}
                                  onChange={(e) =>
                                    setActiveProfile({
                                      ...activeProfile,
                                      tts_config: { ...activeProfile.tts_config, speed: Number(e.target.value) },
                                    })
                                  }
                                  className="w-full mt-2"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-400 mb-1">Pitch ({activeProfile.tts_config?.pitch || 0} Hz)</label>
                                <input
                                  type="range"
                                  min="-10"
                                  max="10"
                                  step="1"
                                  value={activeProfile.tts_config?.pitch || 0}
                                  onChange={(e) =>
                                    setActiveProfile({
                                      ...activeProfile,
                                      tts_config: { ...activeProfile.tts_config, pitch: Number(e.target.value) },
                                    })
                                  }
                                  className="w-full mt-2"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-400 mb-1">Cutting Energy Cadence</label>
                                <select
                                  value={activeProfile.cut_config?.energy || "normal"}
                                  onChange={(e) =>
                                    setActiveProfile({
                                      ...activeProfile,
                                      cut_config: { ...activeProfile.cut_config, energy: e.target.value },
                                    })
                                  }
                                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
                                >
                                  <option value="calm">Calm (4.5s cuts)</option>
                                  <option value="normal">Normal (3.2s cuts)</option>
                                  <option value="high">High Energy (2.5s cuts)</option>
                                  <option value="frantic">Frantic (1.8s cuts)</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Pillar 3: Visual & Image */}
                        {profileEditorTab === "image" && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-gray-400 mb-1">Default Image Generator</label>
                                <select
                                  value={activeProfile.image_motion_config?.model || "animagine-xl"}
                                  onChange={(e) =>
                                    setActiveProfile({
                                      ...activeProfile,
                                      image_motion_config: { ...activeProfile.image_motion_config, model: e.target.value },
                                    })
                                  }
                                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
                                >
                                  <option value="animagine-xl">Animagine XL 4.0 Lightning (Local Default 4-Step)</option>
                                  <option value="colab-wan2gp">Google Colab Wan2GP (Remote Heavy A100)</option>
                                  <option value="flux-schnell">FLUX.1-schnell (Optional Local 18 GB)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-gray-400 mb-1">Aspect Ratio</label>
                                <select
                                  value={activeProfile.render_config?.aspect_ratio || "9:16"}
                                  onChange={(e) =>
                                    setActiveProfile({
                                      ...activeProfile,
                                      render_config: { ...activeProfile.render_config, aspect_ratio: e.target.value },
                                    })
                                  }
                                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
                                >
                                  <option value="9:16">9:16 Vertical (Shorts, Reels, TikTok)</option>
                                  <option value="16:9">16:9 Widescreen (YouTube Standard)</option>
                                  <option value="1:1">1:1 Square (Instagram Feed)</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-gray-400 mb-1">Style Prompt Prefix</label>
                              <textarea
                                rows={2}
                                value={activeProfile.image_motion_config?.style_prefix || ""}
                                onChange={(e) =>
                                  setActiveProfile({
                                    ...activeProfile,
                                    image_motion_config: { ...activeProfile.image_motion_config, style_prefix: e.target.value },
                                  })
                                }
                                className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-gray-400 mb-1">Negative Prompt</label>
                              <textarea
                                rows={2}
                                value={activeProfile.image_motion_config?.negative_prompt || ""}
                                onChange={(e) =>
                                  setActiveProfile({
                                    ...activeProfile,
                                    image_motion_config: { ...activeProfile.image_motion_config, negative_prompt: e.target.value },
                                  })
                                }
                                className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
                              />
                            </div>
                          </div>
                        )}

                        {/* Pillar 4: Motion */}
                        {profileEditorTab === "motion" && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-gray-400 mb-1">Motion Mode</label>
                                <select
                                  value={activeProfile.image_motion_config?.motion_mode || "parallax_2.5d"}
                                  onChange={(e) =>
                                    setActiveProfile({
                                      ...activeProfile,
                                      image_motion_config: { ...activeProfile.image_motion_config, motion_mode: e.target.value },
                                    })
                                  }
                                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
                                >
                                  <option value="parallax_2.5d">2.5D Depth Parallax (Fast Local Depth-Anything)</option>
                                  <option value="colab_wan2gp">Colab Wan2GP I2V (AI Video Diffusion)</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-gray-400 mb-1">Default Camera Trajectory</label>
                                <select
                                  value={activeProfile.image_motion_config?.trajectory || "push_in"}
                                  onChange={(e) =>
                                    setActiveProfile({
                                      ...activeProfile,
                                      image_motion_config: { ...activeProfile.image_motion_config, trajectory: e.target.value },
                                    })
                                  }
                                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
                                >
                                  <option value="push_in">Dolly Push-In</option>
                                  <option value="orbit">Subtle Orbit</option>
                                  <option value="pan_left">Pan Left</option>
                                  <option value="pan_right">Pan Right</option>
                                  <option value="pull_out">Slow Pull-Out</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Pillar 5: Render */}
                        {profileEditorTab === "render" && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-gray-400 mb-1">Resolution</label>
                                <input
                                  type="text"
                                  value={activeProfile.render_config?.resolution || "1080x1920"}
                                  onChange={(e) =>
                                    setActiveProfile({
                                      ...activeProfile,
                                      render_config: { ...activeProfile.render_config, resolution: e.target.value },
                                    })
                                  }
                                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white font-mono"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-400 mb-1">FPS</label>
                                <select
                                  value={activeProfile.render_config?.fps || 30}
                                  onChange={(e) =>
                                    setActiveProfile({
                                      ...activeProfile,
                                      render_config: { ...activeProfile.render_config, fps: Number(e.target.value) },
                                    })
                                  }
                                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
                                >
                                  <option value={30}>30 FPS</option>
                                  <option value={60}>60 FPS</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-gray-400 mb-1">Subtitle Style</label>
                                <select
                                  value={activeProfile.render_config?.subtitle_style || "cinematic_yellow"}
                                  onChange={(e) =>
                                    setActiveProfile({
                                      ...activeProfile,
                                      render_config: { ...activeProfile.render_config, subtitle_style: e.target.value },
                                    })
                                  }
                                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
                                >
                                  <option value="cinematic_yellow">Cinematic Active Yellow Highlight</option>
                                  <option value="minimal_white">Minimal Clean White</option>
                                  <option value="boxed_subtitles">Boxed Subtitle Pill</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end pt-3 border-t border-gray-800">
                          <button
                            onClick={handleSaveActiveProfile}
                            className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-600/30"
                          >
                            Save Profile Changes
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: MODELS (With Delete / Download / Status) */}
                {userSettingsTab === "models" && (
                  <div className="space-y-4">
                    <div className="border-b border-gray-800 pb-3">
                      <h3 className="text-sm font-bold text-white">Model Inventory & Storage Configurator</h3>
                      <p className="text-xs text-gray-400">Manage, download, and delete local HuggingFace cache models.</p>
                    </div>

                    <div className="space-y-3 text-xs">
                      {models.map((m) => {
                        const isLoadingThis = loadingModelId === m.id;
                        return (
                          <div key={m.id || m.name} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">{m.label}</span>
                                {m.installed ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold border border-emerald-800 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Installed
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-400 text-[10px] font-bold border border-gray-700">
                                    Not Downloaded
                                  </span>
                                )}
                                {m.is_default && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px] font-bold border border-blue-800">
                                    Local Default
                                  </span>
                                )}
                              </div>
                              <span className="text-gray-400 text-[11px] block mt-1">{m.description}</span>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-mono text-xs text-gray-300">
                                {m.installed && m.size_mb > 0
                                  ? `${m.size_mb >= 1000 ? (m.size_mb / 1024).toFixed(1) + " GB" : m.size_mb + " MB"}`
                                  : `Optional (~18 GB)`}
                              </span>

                              {/* Actions */}
                              {m.installed ? (
                                <div className="flex items-center gap-1.5">
                                  {m.category === "image" && (
                                    <button
                                      onClick={async () => {
                                        await api.clearModelCache(m.id || m.name);
                                        alert("Compiled .blob kernel cache cleared! Disk space reclaimed.");
                                      }}
                                      className="px-2.5 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px]"
                                    >
                                      Free Blob Cache
                                    </button>
                                  )}
                                  {/* Delete Model Button */}
                                  {m.category !== "tts" && (
                                    <button
                                      onClick={() => handleDeleteModel(m.id || m.name)}
                                      disabled={isLoadingThis}
                                      className="px-2.5 py-1.5 rounded bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-300 text-[11px] flex items-center gap-1"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                /* Download Button for uninstalled models */
                                <button
                                  onClick={() => handleDownloadModel(m.id || m.name)}
                                  disabled={isLoadingThis}
                                  className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-lg shadow-blue-600/30"
                                >
                                  {isLoadingThis ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                  <span>{isLoadingThis ? "Downloading..." : "Download Model"}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 3: API KEYS */}
                {userSettingsTab === "api" && (
                  <div className="space-y-4 text-xs">
                    <div className="border-b border-gray-800 pb-3">
                      <h3 className="text-sm font-bold text-white">API Keys & Cloud Accelerators</h3>
                      <p className="text-gray-400">Configure LLM providers and Google Colab Wan2GP tunnel.</p>
                    </div>

                    <div className="space-y-3 max-w-xl">
                      <div>
                        <label className="block text-gray-400 mb-1">DeepSeek API Key (Default for Story & Script)</label>
                        <input
                          type="password"
                          value={apiKeys.deepseek_api_key || ""}
                          onChange={(e) => setApiKeys({ ...apiKeys, deepseek_api_key: e.target.value })}
                          placeholder="sk-..."
                          className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-1">OpenAI API Key (Optional)</label>
                        <input
                          type="password"
                          value={apiKeys.openai_api_key || ""}
                          onChange={(e) => setApiKeys({ ...apiKeys, openai_api_key: e.target.value })}
                          placeholder="sk-..."
                          className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 mb-1">Ollama Base URL (Local LLM)</label>
                        <input
                          type="text"
                          value={apiKeys.ollama_base_url || "http://127.0.0.1:11434/v1"}
                          onChange={(e) => setApiKeys({ ...apiKeys, ollama_base_url: e.target.value })}
                          className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-white font-mono"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={async () => {
                            await api.saveApiKeys(apiKeys);
                            alert("API Keys saved successfully!");
                          }}
                          className="px-4 py-2 rounded bg-blue-600 text-white font-bold"
                        >
                          Save API Keys
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: STORAGE */}
                {userSettingsTab === "storage" && (
                  <div className="space-y-4 text-xs">
                    <div className="border-b border-gray-800 pb-3">
                      <h3 className="text-sm font-bold text-white">Storage Locations & Disk Telemetry</h3>
                      <p className="text-gray-400">On-disk locations for channel databases, artifacts, and caches.</p>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2 font-mono text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Data Directory:</span>
                        <span className="text-white">{storageInfo.data_dir}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Channels Directory:</span>
                        <span className="text-white">{storageInfo.channels_dir}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cache Directory:</span>
                        <span className="text-white">{storageInfo.cache_dir}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Free Disk Space:</span>
                        <span className="text-emerald-400 font-bold">{storageInfo.disk_free_gb} GB / {storageInfo.disk_total_gb} GB</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COLAB BRIDGE MODAL */}
      {showColabModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold text-white">Google Colab Wan2GP Settings</h3>
              <button onClick={() => setShowColabModal(false)} className="text-gray-400 hover:text-white text-xl font-bold">
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">Colab Tunnel URL (Cloudflare / ngrok)</label>
                <input
                  type="text"
                  value={colabConfig.url}
                  onChange={(e) => setColabConfig({ ...colabConfig, url: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-white font-mono"
                />
              </div>
              <div className="p-3 bg-gray-900 rounded-xl border border-gray-800 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-bold">{colabStatus.online ? "ONLINE" : "OFFLINE"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hardware:</span>
                  <span className="text-white">{colabStatus.gpu_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>VRAM:</span>
                  <span className="text-orange-400">{colabStatus.vram_used_gb} / {colabStatus.vram_total_gb} GB</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
              <button
                onClick={async () => {
                  const ping = await api.testColab(colabConfig.url);
                  setColabStatus(ping);
                  alert(`Ping latency: ${ping.latency_ms}ms to Colab Wan2GP!`);
                }}
                className="px-3 py-1.5 rounded bg-gray-800 text-gray-200 text-xs"
              >
                Test Ping
              </button>
              <button
                onClick={async () => {
                  await api.saveColab(colabConfig.url);
                  setShowColabModal(false);
                }}
                className="px-4 py-1.5 rounded bg-orange-600 text-white font-bold text-xs"
              >
                Save Bridge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETUP WIZARD MODAL */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-base font-bold text-white">First-Run Setup & Model Verification</h3>
              <button onClick={() => setShowOnboarding(false)} className="text-gray-400 hover:text-white text-xl font-bold">
                &times;
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Animagine XL 4.0 Lightning</span>
                  <span className="text-[11px] text-gray-400">Local Default 4-step OpenVINO generator</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-800">
                  Ready (Cached)
                </span>
              </div>
              <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Faster-Whisper Base</span>
                  <span className="text-[11px] text-gray-400">Word-level speech-to-text alignment</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-800">
                  Ready (Cached)
                </span>
              </div>
              <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Depth-Anything-V2</span>
                  <span className="text-[11px] text-gray-400">2.5D Parallax depth estimation</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-800">
                  Ready (Cached)
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-800">
              <button
                onClick={() => setShowOnboarding(false)}
                className="px-4 py-1.5 rounded bg-blue-600 text-white text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE JOB QUEUE MODAL */}
      {showQueueModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <h3 className="text-sm font-bold text-white">Pipeline Execution & Job Queue</h3>
              </div>
              <button onClick={() => setShowQueueModal(false)} className="text-gray-400 hover:text-white text-xl font-bold">
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {currentRunningTask ? (
                <div className="p-3 bg-blue-950/40 border border-blue-800/80 rounded-xl flex items-start gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-white block">Active Task In Progress:</span>
                    <span className="text-blue-300 font-mono text-[11px] block">{currentRunningTask}</span>
                    <span className="text-[10px] text-gray-400">Running on decoupled thread. UI remains fully interactive.</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-xl text-center space-y-1">
                  <span className="text-emerald-400 font-bold block">No Active Tasks</span>
                  <span className="text-[11px] text-gray-400 block">The pipeline queue is currently idle. Click any stage action to enqueue.</span>
                </div>
              )}

              {jobQueue.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Queued Operations ({jobQueue.length})</span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {jobQueue.map((job) => (
                      <div key={job.id} className="p-2.5 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-between">
                        <span className="text-gray-200">{job.label}</span>
                        <span className="px-2 py-0.5 rounded bg-gray-800 text-[10px] text-gray-400 font-mono uppercase">Queued</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-800">
              <button
                onClick={() => setShowQueueModal(false)}
                className="px-4 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Image Lightbox Viewer */}
      {lightboxShotIdx !== null && activeLightboxShot && (
        <div 
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxShotIdx(null);
          }}
        >
          {/* Close Button */}
          <button
            onClick={() => setLightboxShotIdx(null)}
            className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-gray-900/80 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 transition"
            title="Close viewer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Navigation Arrows */}
          {lightboxShotIdx > 1 && (
            <button
              onClick={() => setLightboxShotIdx(lightboxShotIdx - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-gray-900/80 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 transition"
              title="Previous Shot (Left Arrow)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {lightboxShotIdx < combinedShots.length && (
            <button
              onClick={() => setLightboxShotIdx(lightboxShotIdx + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-gray-900/80 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700 transition"
              title="Next Shot (Right Arrow)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Content Container */}
          <div className="max-w-5xl w-full max-h-[92vh] flex flex-col md:flex-row bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Main Visual Display */}
            <div className="flex-1 bg-black flex items-center justify-center relative min-h-[350px] p-2">
              {activeLightboxShot.hasImage ? (
                <img
                  src={activeLightboxShot.imageUrl || ""}
                  alt={`Shot #${activeLightboxShot.index}`}
                  className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-lg"
                />
              ) : (
                <div className="text-center p-8 space-y-2 text-gray-500">
                  <Film className="w-12 h-12 mx-auto text-gray-600 animate-pulse" />
                  <p className="text-sm font-semibold">Shot #{activeLightboxShot.index} Not Yet Generated</p>
                  <button
                    onClick={() => handleRerollImage(activeLightboxShot.index)}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
                  >
                    Generate Image Now
                  </button>
                </div>
              )}

              {/* Shot Index Pill */}
              <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
                <span className="px-3 py-1 rounded-full bg-blue-600/90 text-white font-mono text-xs font-bold shadow">
                  Shot #{activeLightboxShot.index} of {combinedShots.length}
                </span>
                {activeLightboxShot.elapsed_s && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/90 text-black font-mono text-xs font-extrabold shadow">
                    ⚡ {activeLightboxShot.elapsed_s.toFixed(1)}s
                  </span>
                )}
              </div>
            </div>

            {/* Side Details Inspector */}
            <div className="w-full md:w-80 p-5 bg-gray-950 border-t md:border-t-0 md:border-l border-gray-800 flex flex-col justify-between gap-4 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Shot Inspector</span>
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Duration: <span className="text-emerald-400 font-mono font-semibold">{activeLightboxShot.duration ? activeLightboxShot.duration.toFixed(1) : "3.0"}s</span> · {activeLightboxShot.engine === "colab" ? "Colab SDXL-Turbo" : "Local Animagine"}
                  </p>
                </div>

                {/* Spoken Narration */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                    🎙️ Spoken Narration
                  </span>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-300 italic leading-relaxed">
                    "{activeLightboxShot.text || "No spoken audio"}"
                  </div>
                </div>

                {/* Visual Prompt */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1">
                      🎨 Visual Scene Prompt
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeLightboxShot.visual_prompt || activeLightboxShot.text);
                        showAlert("Copied visual prompt to clipboard!", "success");
                      }}
                      className="text-[10px] text-gray-400 hover:text-white transition"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 leading-relaxed font-mono select-text">
                    {activeLightboxShot.visual_prompt || activeLightboxShot.text}
                  </div>
                </div>

                {/* Camera Motion */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                    📹 Motion & Staging
                  </span>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs text-purple-200 font-mono">
                    {activeLightboxShot.camera_motion || "Cinematic push-in"}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-3 border-t border-gray-800">
                <button
                  onClick={() => handleRerollImage(activeLightboxShot.index)}
                  disabled={rerollingShotIdx === activeLightboxShot.index}
                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow"
                >
                  {rerollingShotIdx === activeLightboxShot.index ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  <span>Re-roll Visual ({imageEngine === "colab" ? "Colab GPU" : "Local"})</span>
                </button>

                {activeLightboxShot.hasImage && (
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={activeLightboxShot.imageUrl || "#"}
                      download={`shot_${String(activeLightboxShot.index).padStart(3, "0")}.png`}
                      className="py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download</span>
                    </a>
                    <button
                      onClick={() => window.open(activeLightboxShot.imageUrl || "", "_blank")}
                      className="py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open Tab</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copyable Alert & Notification Modal */}
      {modalNotice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-base font-bold flex items-center gap-2 ${
                modalNotice.type === 'error' ? 'text-rose-400' :
                modalNotice.type === 'success' ? 'text-emerald-400' : 'text-cyan-400'
              }`}>
                {modalNotice.type === 'error' ? '⚠️' : modalNotice.type === 'success' ? '✅' : 'ℹ️'}
                {modalNotice.title || 'Notice'}
              </h3>
              <button
                onClick={() => setModalNotice(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap select-text cursor-text max-h-72 overflow-y-auto">
              {modalNotice.message}
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(modalNotice.message);
                  setCopiedNotice(true);
                  setTimeout(() => setCopiedNotice(false), 2000);
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition flex items-center gap-1.5"
              >
                {copiedNotice ? "✓ Copied!" : "📋 Copy Message"}
              </button>
              <button
                onClick={() => setModalNotice(null)}
                className="px-5 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition shadow-lg shadow-cyan-900/30"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
