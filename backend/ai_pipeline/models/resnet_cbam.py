"""
ResNet-50 with CBAM attention for crop disease detection.
Combines ImageNet pre-trained ResNet-50 backbone with a 2048-channel CBAM block
and an agricultural classification head.
"""

import torch
import torch.nn as nn
from torchvision import models
from .cbam import CBAM


class ResNet50_CBAM(nn.Module):
    """
    ResNet-50 backbone + CBAM attention + custom classifier head.

    Architecture:
        Input: (B, 3, 224, 224)
        Backbone: ResNet-50 [conv1, bn1, relu, maxpool, layer1, layer2, layer3, layer4]
        Attention: CBAM(in_channels=2048, reduction_ratio=16, kernel_size=7)
        Pooling: AdaptiveAvgPool2d((1, 1)) -> (B, 2048)
        Classifier: Dropout(0.4) -> Linear(2048, 512) -> ReLU -> Dropout(0.2) -> Linear(512, num_classes)
    """
    def __init__(self, num_classes=306, pretrained=True,
                 dropout=0.4, freeze_backbone=True, unfreeze_last_n=2):
        super(ResNet50_CBAM, self).__init__()

        # Load ResNet-50 backbone
        if pretrained:
            try:
                weights = models.ResNet50_Weights.IMAGENET1K_V2
                backbone = models.resnet50(weights=weights)
            except Exception:
                # Fallback for older torchvision versions
                backbone = models.resnet50(pretrained=True)
        else:
            try:
                backbone = models.resnet50(weights=None)
            except Exception:
                backbone = models.resnet50(pretrained=False)

        # Extract feature layers
        self.conv1 = backbone.conv1
        self.bn1 = backbone.bn1
        self.relu = backbone.relu
        self.maxpool = backbone.maxpool

        self.layer1 = backbone.layer1  # 256 channels
        self.layer2 = backbone.layer2  # 512 channels
        self.layer3 = backbone.layer3  # 1024 channels
        self.layer4 = backbone.layer4  # 2048 channels

        # CBAM block applied after layer4 (2048 feature channels)
        self.cbam = CBAM(in_channels=2048, reduction_ratio=16, kernel_size=7)

        # Global Average Pooling
        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))

        # Specialized classifier head
        self.classifier = nn.Sequential(
            nn.Dropout(p=dropout),
            nn.Linear(2048, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(p=dropout * 0.5),
            nn.Linear(512, num_classes),
        )

        # Initialize newly added weights
        self._init_new_layers()

        # Backbone freeze strategy (prevents catastrophic forgetting)
        if freeze_backbone:
            self._freeze_backbone(unfreeze_last_n=unfreeze_last_n)

    def _init_new_layers(self):
        """Initialize CBAM and classifier with Kaiming / Normal distributions."""
        for m in self.cbam.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
            elif isinstance(m, nn.Linear):
                nn.init.normal_(m.weight, 0, 0.01)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)

        for m in self.classifier.modules():
            if isinstance(m, nn.Linear):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)

    def _freeze_backbone(self, unfreeze_last_n=2):
        """
        Freeze early layers (conv1 through layer3 and beginning of layer4).
        Unfreeze the last N bottleneck blocks of layer4 + CBAM + classifier head.
        This provides transfer learning stability on agricultural domain adaptations.
        """
        # Freeze all parameters
        for param in self.parameters():
            param.requires_grad = False

        # Unfreeze CBAM and classifier head
        for param in self.cbam.parameters():
            param.requires_grad = True
        for param in self.classifier.parameters():
            param.requires_grad = True

        # Unfreeze last N blocks of layer4
        layer4_blocks = list(self.layer4.children())
        if unfreeze_last_n > 0:
            for block in layer4_blocks[-unfreeze_last_n:]:
                for param in block.parameters():
                    param.requires_grad = True

    def forward(self, x):
        # Feature extraction through backbone
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu(x)
        x = self.maxpool(x)

        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)  # Shape: (B, 2048, H/32, W/32)

        # Apply CBAM Attention
        x = self.cbam(x)     # Channel and spatially refined features

        # Pooling and classification
        x = self.avgpool(x)  # Shape: (B, 2048, 1, 1)
        x = torch.flatten(x, 1)  # Shape: (B, 2048)
        x = self.classifier(x)   # Shape: (B, num_classes)

        return x

    def get_grad_cam_target_layer(self):
        """Returns the target layer for Grad-CAM explainability heatmaps."""
        return self.layer4[-1]
