"""Hardware & accelerator detection for Autitic Studio."""

from __future__ import annotations

import platform
import shutil
import subprocess
from dataclasses import dataclass
from typing import Dict, List, Optional

@dataclass
class HardwareReport:
    platform: str
    cpu: str
    ram_gb: float
    gpus: List[Dict[str, str]]
    has_openvino: bool
    has_cuda: bool
    recommended_image_device: str

def detect_hardware() -> HardwareReport:
    # Check OpenVINO
    has_ov = False
    ov_devices = []
    try:
        import openvino as ov
        core = ov.Core()
        ov_devices = list(core.available_devices)
        has_ov = True
    except Exception:
        pass

    # Check CUDA
    has_cuda = False
    try:
        import torch
        has_cuda = torch.cuda.is_available()
    except Exception:
        pass

    # Detect GPU devices
    gpus = []
    if "GPU" in ov_devices:
        gpus.append({"name": "Intel Arc / Xe iGPU", "backend": "OpenVINO"})
    if has_cuda:
        gpus.append({"name": "NVIDIA CUDA GPU", "backend": "PyTorch"})

    # Determine recommended image device for Animagine XL 4.0 Lightning
    recommended = "CPU"
    if "GPU" in ov_devices:
        recommended = "GPU"
    elif has_cuda:
        recommended = "CUDA"

    return HardwareReport(
        platform=platform.system(),
        cpu=platform.processor() or "Unknown CPU",
        ram_gb=16.0, # Default estimate
        gpus=gpus,
        has_openvino=has_ov,
        has_cuda=has_cuda,
        recommended_image_device=recommended,
    )
