"""Autitic Studio LLM Provider & Story/Script Authoring Engine.

Modular 3-Tier Pipeline inspired by ReelForge:
    Idea   -> Premise, audience, tone, pattern, target duration
    Story  -> Treatment: Hook, Arc (scene jobs), setting, characters, payoff, callback
    Script -> Beats: Purpose, Voiceover, Visual Note, word & timing metrics
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict, List, Optional
import httpx

log = logging.getLogger(__name__)

STORY_SYSTEM_PROMPT = """\
You are an expert video director and narrative architect. You are given a video premise.
Return a TREATMENT (what the video is, before any specific words are narrated).

Rules:
- Preserve the premise's meaning, characters, and events faithfully.
- Hook: Immediate grab in the first 3 seconds.
- Arc: Exactly one entry per scene, each with a DISTINCT narrative job.
- Setting & Characters: Specify who recurs so visual continuity is preserved.
- Payoff & Callback: Final scene ties back to the opening premise or lesson.
- Return strictly a valid JSON object matching the requested schema.
"""

SCRIPT_SYSTEM_PROMPT = """\
You write the narration and visual cues for a short animated video, scene by scene, from a story treatment.

Return one beat per scene in `beats`. Each beat MUST contain:
- purpose: 3-5 words defining the narrative job (e.g., "The Theft Discovered", "The Mimicry Trick")
- vo: The voiceover spoken out loud by the narrator. Plain, rhythmic, cinematic speech.
- visual_note: Exactly what is on screen in one concrete sentence for the animator/diffusion model.

Rules:
- Strictly adhere to the scene arc order.
- Each sentence must end inside its beat. Never split a sentence across beats.
- No meta text like "Scene 1:", no stage directions in vo, no quotes.
- Return strictly a valid JSON object matching the requested schema.
"""

class LLMService:
    def __init__(self):
        self.timeout_s = 60.0

    def _get_credentials(self, explicit_key: Optional[str] = None) -> tuple[str, str, str]:
        """Returns (provider, api_key, base_url)."""
        provider = os.environ.get("AUTITIC_LLM_PROVIDER", "deepseek").lower()
        key = explicit_key or os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("OPENAI_API_KEY") or ""
        
        if provider == "deepseek":
            return "deepseek", key or os.environ.get("DEEPSEEK_API_KEY", ""), "https://api.deepseek.com/v1"
        elif provider == "openai":
            return "openai", key or os.environ.get("OPENAI_API_KEY", ""), "https://api.openai.com/v1"
        elif provider == "ollama":
            url = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1")
            return "ollama", "ollama", url
        return "deepseek", key, "https://api.deepseek.com/v1"

    async def complete_chat(
        self,
        messages: List[Dict[str, str]],
        json_schema_prompt: str,
        explicit_key: Optional[str] = None,
        temperature: float = 0.7,
    ) -> Optional[Dict[str, Any]]:
        provider, api_key, base_url = self._get_credentials(explicit_key)
        if not api_key and provider != "ollama":
            log.info("No LLM API key configured; falling back to narrative engine.")
            return None

        payload = {
            "model": "deepseek-chat" if provider == "deepseek" else ("gpt-4o-mini" if provider == "openai" else "llama3.2"),
            "messages": messages + [{"role": "system", "content": f"Schema:\n{json_schema_prompt}\nRespond in valid JSON."}],
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        }
        headers = {"Content-Type": "application/json"}
        if api_key and provider != "ollama":
            headers["Authorization"] = f"Bearer {api_key}"

        try:
            async with httpx.AsyncClient(timeout=self.timeout_s) as client:
                resp = await client.post(f"{base_url}/chat/completions", json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    return json.loads(content)
                else:
                    log.warning(f"LLM API returned {resp.status_code}: {resp.text}")
        except Exception as e:
            log.warning(f"LLM call failed: {e}. Falling back to internal narrative generator.")
        return None

llm_service = LLMService()

# ---------------------------------------------------------------------------
# Tier 1: Generate Story from Idea
# ---------------------------------------------------------------------------
async def generate_story_from_idea(
    idea: Dict[str, Any],
    script_config: Optional[Dict[str, Any]] = None,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    premise = idea.get("premise", "").strip()
    source = idea.get("source", "").strip()
    script_cfg = script_config or {}
    tone = idea.get("tone") or script_cfg.get("tone") or "cinematic, engaging"
    audience = idea.get("audience") or script_cfg.get("target_audience") or "All audiences"
    target_seconds = float(idea.get("target_seconds") or script_cfg.get("target_duration_s") or 60)
    
    # Scene count priority: idea.scene_count > script_cfg.beat_target > duration calculation
    beat_target = int(idea.get("scene_count") or idea.get("beat_target") or script_cfg.get("beat_target") or max(3, min(10, round(target_seconds / 10.0))))
    pattern = idea.get("pattern") or script_cfg.get("pattern") or "fable"

    # Try LLM
    prompt_user = f"Premise: {premise}\nSource: {source}\nTone: {tone}\nTarget Audience: {audience}\nNarrative Style/Pattern: {pattern}\nExact Number of scenes: {beat_target}"
    schema = """{
      "title": "Short title",
      "logline": "One sentence summary",
      "core_message": "Moral or central takeaway",
      "hook": "Grabbing first scene setup",
      "arc": ["Scene 1 action", "Scene 2 action", ...],
      "setting": "Visual environment",
      "characters": ["Character A", "Character B"],
      "payoff": "Climactic resolution",
      "callback": "Final image or echoing thought"
    }"""

    res = await llm_service.complete_chat(
        messages=[
            {"role": "system", "content": STORY_SYSTEM_PROMPT},
            {"role": "user", "content": prompt_user},
        ],
        json_schema_prompt=schema,
        explicit_key=api_key,
    )
    if res and "arc" in res and len(res["arc"]) > 0:
        res["pattern"] = pattern
        res["target_seconds"] = target_seconds
        res["scene_count"] = len(res["arc"])
        return res

    # Creator Narrative Pattern Fallbacks
    return fallback_story_generator(premise, tone, audience, beat_target, pattern=pattern)

def fallback_story_generator(premise: str, tone: str, audience: str, beat_target: int, pattern: str = "fable") -> Dict[str, Any]:
    p_lower = pattern.lower()

    if "johnny" in p_lower or "investigat" in p_lower:
        # Johnny Harris Style: Map, History, Hidden System, Reveal
        title = premise[:40].title() if premise else "The Untold Investigation"
        arc_templates = [
            f"Introduce the startling paradox: Why does {premise or 'this phenomenon'} exist right before our eyes, yet nobody asks how it started?",
            "Zoom out to high-contrast geographical maps: tracking the historical origins and borders where the story began decades ago.",
            "Deconstruct the hidden economic mechanism and paperwork that quietly keeps the system running in plain sight.",
            "The inflection point: how an unforeseen consequence collided with everyday lives.",
            "The revelation: showing that this isn't an isolated anomaly, but a mirror reflecting our entire world today.",
            "Final reflection with dramatic pause: why understanding this pattern changes how we see our future.",
        ]
        chosen_arc = arc_templates[:beat_target]
        while len(chosen_arc) < beat_target:
            chosen_arc.append(f"Investigative detail {len(chosen_arc)+1}: examining the data trail and satellite imagery.")
        return {
            "title": title,
            "logline": f"An investigative deep-dive into the hidden systems and maps behind {premise or 'the story'}.",
            "core_message": "The world is shaped by invisible borders, historical momentum, and systems hiding in plain sight.",
            "hook": chosen_arc[0],
            "arc": chosen_arc,
            "setting": "Minimalist dark editorial studio with glowing historical maps and archival documents",
            "characters": ["Investigative Host", "Historical figures", "Archival witnesses"],
            "payoff": chosen_arc[-1],
            "callback": "A slow pull-back from the illuminated map, leaving the viewer with an unforgettable question.",
            "pattern": "johnny_harris",
            "tone": "analytical, urgent, serious yet conversational",
            "target_seconds": beat_target * 10,
        }

    elif "veritasium" in p_lower or "science" in p_lower:
        # Veritasium Style: Counter-intuitive query, misconception trap, experiment, physical insight
        title = premise[:40].title() if premise else "The Counter-Intuitive Truth"
        arc_templates = [
            f"Ask a seemingly simple question about {premise or 'this concept'} that almost everyone gets completely wrong.",
            "Show the common sense misconception and why our intuition fails under close inspection.",
            "Conduct a mind-bending physical demonstration that contradicts everyday expectations.",
            "Reveal the microscopic or fundamental physics law driving the phenomenon.",
            "The epiphany: turning the original paradox upside down with indisputable clarity.",
            "Closing takeaway: how the universe works in ways far stranger than our common sense suggests.",
        ]
        chosen_arc = arc_templates[:beat_target]
        while len(chosen_arc) < beat_target:
            chosen_arc.append(f"Experimental beat {len(chosen_arc)+1}: testing boundary conditions in the lab.")
        return {
            "title": title,
            "logline": f"Why our common sense about {premise or 'this concept'} is fundamentally flawed, explained through physics.",
            "core_message": "Reality doesn't conform to our intuition—it conforms to physical laws waiting to be tested.",
            "hook": chosen_arc[0],
            "arc": chosen_arc,
            "setting": "Cinematic laboratory with dark optical benches, lasers, and precision apparatus",
            "characters": ["Curious Physicist Host", "Engaged Observer"],
            "payoff": chosen_arc[-1],
            "callback": "A slow-motion visual of the experiment demonstrating the beauty of physical law.",
            "pattern": "veritasium",
            "tone": "intellectually curious, contemplative, cinematic",
            "target_seconds": beat_target * 10,
        }

    elif "jenny" in p_lower or "viral" in p_lower or "hoyos" in p_lower:
        # Jenny Hoyos Style: 1-sec visual hook, budget/challenge stakes, rapid escalation, shock payoff
        title = premise[:40].title() if premise else "I Tried The Impossible"
        arc_templates = [
            f"Sub-1-second visual shock hook: 'Can someone actually master {premise or 'this challenge'} in 60 seconds?'",
            "Rule declaration: The timer starts now, and there is zero room for mistakes.",
            "Rapid micro-failure: The first attempt completely backfires with hilarious consequences.",
            "The clever pivot: An unconventional trick that flips the odds in seconds.",
            "The final high-speed sprint to the deadline as tension peaks.",
            "Instant explosive payoff: The challenge is won with proof right on screen!",
        ]
        chosen_arc = arc_templates[:beat_target]
        while len(chosen_arc) < beat_target:
            chosen_arc.append(f"Rapid escalation beat {len(chosen_arc)+1}: overcoming the next obstacle in 2 seconds.")
        return {
            "title": title,
            "logline": f"A relentless 60-second high-energy challenge testing {premise or 'the concept'}.",
            "core_message": "Relentless energy and clever resourcefulness always find a way.",
            "hook": chosen_arc[0],
            "arc": chosen_arc,
            "setting": "Vibrant, high-contrast studio environment with real physical props and dynamic camera POV",
            "characters": ["Energetic Host (high tempo)", "Challenge participants"],
            "payoff": chosen_arc[-1],
            "callback": "Holding up the final victorious result directly to the camera with a triumphant smile.",
            "pattern": "jenny_hoyos",
            "tone": "high energy, enthusiastic, punchy, hyper-retention",
            "target_seconds": beat_target * 8,
        }

    elif "zack" in p_lower or "morbid" in p_lower or "anatom" in p_lower:
        # Zack D Films Style: Morbid curiosity question, 3D anatomical cross-section, eerie precision
        title = premise[:40].title() if premise else "What Actually Happens"
        arc_templates = [
            f"Hypnotic hook: 'What actually happens inside when {premise or 'this occurs'}?'",
            "Camera smoothly pushes in to reveal a crisp 3D cross-section showing internal mechanisms.",
            "The microscopic chain reaction begins: cells, fluids, and structures interact in surprising detail.",
            "The critical turning point: an unexpected biological or mechanical response triggers.",
            "The final physiological reality: resolving the mystery with startling, clinical clarity.",
        ]
        chosen_arc = arc_templates[:beat_target]
        while len(chosen_arc) < beat_target:
            chosen_arc.append(f"Anatomical cross-section stage {len(chosen_arc)+1}: tracing deeper micro-structural reactions.")
        return {
            "title": title,
            "logline": f"A hyper-realistic 3D anatomical explainer revealing the internal mechanics of {premise or 'the event'}.",
            "core_message": "The human body and physical machines operate with astonishing microscopic complexity.",
            "hook": chosen_arc[0],
            "arc": chosen_arc,
            "setting": "Clinical 3D anatomical space with photorealistic cross-section rendering and dramatic lighting",
            "characters": ["3D Anatomical Human Model", "Microscopic structures"],
            "payoff": chosen_arc[-1],
            "callback": "A continuous push-in concluding on a detailed cross-sectional equilibrium.",
            "pattern": "zack_d_films",
            "tone": "clinical, hypnotic, morbid curiosity, crisp articulation",
            "target_seconds": beat_target * 7,
        }

    # Default Fable Style
    is_hat_seller = any(w in premise.lower() for w in ["hat", "seller", "monkey", "vendor", "cap"])
    if is_hat_seller:
        fable_arc = [
            "The tired vendor sets his heavy basket down and drifts into slumber beneath the cool leaves.",
            "Playful monkeys quietly scamper down the vines, stealing every colorful cap.",
            "The vendor awakens to find his basket empty, gazing up in horror at the grinning troop.",
            "Frustrated, he shouts and shakes his fists, only for the monkeys to mimic every angry gesture.",
            "Realizing their mimicry, the clever merchant rips his cap off and hurls it dramatically to the earth.",
            "Instantly, every monkey copies him, hurling dozens of hats raining down from the canopy.",
            "The merchant quickly gathers his wares with a knowing smile and journeys safely on."
        ]
        return {
            "title": "The Hat Seller and the Monkeys",
            "logline": "When mischievous jungle monkeys steal all his wares, a tired merchant outsmarts them with a brilliant display of reverse psychology.",
            "core_message": "Patience and understanding your opponent's nature can solve what anger never will.",
            "hook": "Deep in a tropical forest, a tired hat vendor carrying a towering wicker basket seeks refuge under an ancient banyan tree.",
            "arc": fable_arc[:beat_target] if len(fable_arc) >= beat_target else fable_arc,
            "setting": "Dense sun-dappled jungle road under an ancient banyan tree",
            "characters": ["The Hat Seller (worn cotton clothes, weathered face)", "Troop of mischievous macaques"],
            "payoff": "A flurry of colorful caps cascading down onto the forest floor as mimicry turns against the thieves.",
            "callback": "A quiet tip of the hat to the jungle as the seller departs with all his merchandise intact.",
            "pattern": "fable",
            "tone": tone,
            "target_seconds": beat_target * 10,
        }

    # Generic narrative fallback
    sentences = [s.strip() for s in re.split(r"[.!?]+", premise) if s.strip()]
    arc = sentences[:beat_target]
    while len(arc) < beat_target:
        if len(arc) == 0:
            arc.append("Introduce the main subject and the central situation.")
        elif len(arc) == 1:
            arc.append("An unexpected obstacle disrupts the ordinary world.")
        elif len(arc) == 2:
            arc.append("Tension peaks as the stakes become undeniable.")
        else:
            arc.append(f"Development {len(arc)+1}: dynamic progression toward the payoff.")

    return {
        "title": premise[:40].title() if premise else "Untitled Story",
        "logline": premise or "A captivating journey unfolds.",
        "core_message": "Ingenuity triumphs over adversity.",
        "hook": arc[0] if arc else "A curious turn of events begins.",
        "arc": arc,
        "setting": "Atmospheric cinematic environment",
        "characters": ["Protagonist", "Surrounding witnesses"],
        "payoff": arc[-1] if arc else "Resolution is achieved.",
        "callback": "Reflecting on the transformative journey.",
        "pattern": "narrative",
        "tone": tone,
        "target_seconds": beat_target * 10,
    }


# ---------------------------------------------------------------------------
# Tier 2: Generate Script & Beats from Story
# ---------------------------------------------------------------------------
async def generate_script_from_story(
    story: Dict[str, Any],
    script_config: Optional[Dict[str, Any]] = None,
    api_key: Optional[str] = None,
) -> Dict[str, Any]:
    arc = story.get("arc", [])
    title = story.get("title", "")
    logline = story.get("logline", "")
    setting = story.get("setting", "")
    characters = story.get("characters", [])
    target_seconds = float(story.get("target_seconds", 60))
    beats_count = len(arc) or 5
    words_budget = round(target_seconds * 2.5)

    prompt_user = f"Title: {title}\nLogline: {logline}\nSetting: {setting}\nCharacters: {characters}\nScene Arc:\n" + \
                  "\n".join(f"{i+1}. {a}" for i, a in enumerate(arc)) + \
                  f"\nTotal Target Words: {words_budget} (approx {round(words_budget/beats_count)} per scene)."

    schema = """{
      "beats": [
        {
          "purpose": "3-5 word scene job",
          "vo": "Cinematic spoken voiceover text",
          "visual_note": "Clear single-sentence drawable scene description"
        }
      ]
    }"""

    res = await llm_service.complete_chat(
        messages=[
            {"role": "system", "content": SCRIPT_SYSTEM_PROMPT},
            {"role": "user", "content": prompt_user},
        ],
        json_schema_prompt=schema,
        explicit_key=api_key,
    )
    if res and "beats" in res and len(res["beats"]) > 0:
        beats = []
        for idx, b in enumerate(res["beats"]):
            vo = b.get("vo", "").strip()
            w_count = len(vo.split())
            beats.append({
                "index": idx + 1,
                "purpose": b.get("purpose", f"Scene {idx+1}"),
                "vo": vo,
                "visual_note": b.get("visual_note", ""),
                "word_count": w_count,
                "estimated_duration_s": round(w_count / 2.5, 1),
            })
        total_w = sum(b["word_count"] for b in beats)
        return {
            "title": title,
            "beats": beats,
            "total_words": total_w,
            "estimated_duration_s": round(total_w / 2.5, 1),
        }

    # Narrative Fallback for Beats
    return fallback_script_generator(story)

def fallback_script_generator(story: Dict[str, Any]) -> Dict[str, Any]:
    arc = story.get("arc", [])
    pattern = (story.get("pattern") or "").lower()
    is_hat_seller = any(w in (story.get("title", "") + story.get("logline", "")).lower() for w in ["hat", "seller", "monkey", "vendor"])
    
    if is_hat_seller and ("fable" in pattern or not pattern):
        beats_data = [
            (
                "Rest Under the Banyan",
                "After a grueling trek under the midday sun, a weary merchant lays his heavy basket of handcrafted hats beside an ancient banyan tree.",
                "A tired merchant with a tall woven basket of colorful caps sits resting in the shade of a colossal banyan tree."
            ),
            (
                "The Canopy Theft",
                "As exhaustion pulls him into slumber, rustling leaves give way to a troop of curious monkeys descending silently from the branches.",
                "Mischievous monkeys quietly climb down twisted vines and lift bright red, blue, and yellow caps from the open basket."
            ),
            (
                "The Empty Basket",
                "He awakens to complete emptiness. Looking upward in disbelief, he sees every branch occupied by monkeys donning his merchandise.",
                "The merchant sits up with wide eyes staring at his empty basket, then looks up to see twenty monkeys wearing his hats in the trees."
            ),
            (
                "Futile Anger",
                "He shakes his fists in fury, yelling at the canopy, only for each monkey to chatter back and mirror his exact furious gestures.",
                "The merchant shouts angrily with clenched fists, while the monkeys in the branches mockingly mimic his angry posture."
            ),
            (
                "The Stroke of Genius",
                "Seeing their relentless mimicry, a clever idea sparks. The merchant dramatically tears his own cap off and hurls it onto the dusty trail.",
                "A realization dawns on the vendor's face; he grabs his own cap and throws it forcefully onto the forest dirt."
            ),
            (
                "Raining Hats",
                "In unison, every monkey mimics the gesture, flinging their stolen hats down like a vibrant, cascading rain.",
                "Dozens of colorful hats shower down from the treetops onto the ground around the merchant."
            ),
            (
                "Triumph of Wit",
                "Smiling calmly, the vendor collects every cap back into his basket, proving that a calm mind conquers chaos.",
                "The merchant cheerfully packs his full basket, tips his hat to the tree canopy, and continues down the sunlit jungle path."
            ),
        ]
        chosen = beats_data[:len(arc)] if arc else beats_data
    elif "johnny" in pattern:
        chosen = []
        for i, stage in enumerate(arc):
            purpose = f"Investigation Beat {i+1}"
            if i == 0:
                vo = f"{stage} Take a close look, because the real explanation has been hidden in plain sight."
                vis = "Editorial darkroom with glowing archival documents and high-contrast analytical map graphics."
            elif i == 1:
                vo = f"To understand this, we have to look back at the historical map borders drawn decades ago. {stage}"
                vis = "3D textured topography map panning across national boundary lines with bold contrast."
            elif i == 2:
                vo = f"Here is the hidden mechanism. While everyone was looking elsewhere, this system took over. {stage}"
                vis = "Cinematic desk overhead shot of satellite imagery, bureaucratic documents, and highlighters."
            else:
                vo = f"{stage} And that brings us to the question that changes how we see our world today."
                vis = "Filmic chiaroscuro shot with moody backlight and subtle documentary film grain."
            chosen.append((purpose, vo, vis))
    elif "veritasium" in pattern:
        chosen = []
        for i, stage in enumerate(arc):
            purpose = f"Inquiry Stage {i+1}"
            if i == 0:
                vo = f"You have probably been told that this is how it works. But is that actually true? {stage}"
                vis = "Dramatic dark studio with optical light beams and precision scientific apparatus."
            elif i == 1:
                vo = f"Most people fall right into this intuition trap. {stage}"
                vis = "Host presenting a clear physical paradox with high-speed macro camera capture."
            elif i == 2:
                vo = f"So what happens when we actually test it under laboratory conditions? {stage}"
                vis = "Physics demonstration bench with laser interferometer and glowing sensors."
            else:
                vo = f"{stage} The reality is far more mind-bending than intuition leads us to believe."
                vis = "Cinematic 8k visual of fundamental physical particles interacting in deep black space."
            chosen.append((purpose, vo, vis))
    elif "jenny" in pattern or "hoyos" in pattern:
        chosen = []
        for i, stage in enumerate(arc):
            purpose = f"Retention Beat {i+1}"
            if i == 0:
                vo = f"Can someone actually pull this off in sixty seconds? {stage}"
                vis = "Ultra-bright dynamic POV close-up with physical stopwatch running on screen."
            elif i == 1:
                vo = f"The timer is ticking and the rules are insane! {stage}"
                vis = "Rapid wide-angle shot showing colorful physical props and high-energy reactions."
            elif i == 2:
                vo = f"Wait, that completely failed! But what if we try this instead? {stage}"
                vis = "Sudden camera punch-in showing quick hands executing a clever tactical pivot."
            else:
                vo = f"{stage} And right as the clock hit zero, look what happened!"
                vis = "Triumphant celebratory close-up holding the completed challenge result directly to lens."
            chosen.append((purpose, vo, vis))
    elif "zack" in pattern:
        chosen = []
        for i, stage in enumerate(arc):
            purpose = f"Anatomy Beat {i+1}"
            if i == 0:
                vo = f"What actually happens inside your body when this occurs? {stage}"
                vis = "Hyper-realistic 3D human model in dark clinical lighting with smooth continuous push-in."
            elif i == 1:
                vo = f"If you slice open a cross-section, you can see the internal mechanism reacting instantly. {stage}"
                vis = "Photorealistic 3D anatomical cutaway showing cross-sectional muscle and nerve structures."
            elif i == 2:
                vo = f"Under microscopic magnification, the cells initiate a domino effect. {stage}"
                vis = "Octane 3D render of cellular receptors and microscopic fluid dynamics in clinical rim lighting."
            else:
                vo = f"{stage} Which is why this astonishing reaction takes place without you ever noticing."
                vis = "Smooth 3D push-in completing on the detailed biological equilibrium inside the body."
            chosen.append((purpose, vo, vis))
    else:
        chosen = []
        for i, stage in enumerate(arc):
            chosen.append((
                f"Scene {i+1}",
                f"{stage}. The moment unfolds with deliberate narrative weight.",
                f"Cinematic atmospheric framing illustrating: {stage}"
            ))

    beats = []
    for idx, (purpose, vo, visual) in enumerate(chosen):
        w_count = len(vo.split())
        beats.append({
            "index": idx + 1,
            "purpose": purpose,
            "vo": vo,
            "visual_note": visual,
            "word_count": w_count,
            "estimated_duration_s": round(w_count / 2.5, 1),
        })

    total_w = sum(b["word_count"] for b in beats)
    return {
        "title": story.get("title", "Generated Script"),
        "beats": beats,
        "total_words": total_w,
        "estimated_duration_s": round(total_w / 2.5, 1),
    }

